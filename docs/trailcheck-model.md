# TrailCheck Model Training and Implementation

This document describes the local TrailCheck model pipeline as it exists in this repository: what the model is for, how the training set is built, how QLoRA is configured, and which runtime path actually runs.

## Current status

The supervised examples are **not hand-built**. `ml/data/build_dataset.py` generates them with deterministic rules from weather rows and NPS alert text. The model, if trained, imitates that rule policy. It does not learn from expert labels.

The last recorded full build, noted in commit `ae20b74` and in an earlier draft of this document, contained **660** examples from **two** parks: Big Bend 366 and Yosemite 294, split 560 train / 100 validation. Those JSONL files are gitignored. A fresh clone does not contain them, and 660 is a dataset split count, not a model score.

There is **no trained adapter** and **no model evaluation** in this repository. A QLoRA run was reported finished on an RTX 4060, but the adapter files were lost and are not in git history. `ml/results/model_eval.json` says `not yet run` until that training is repeated and `evaluate_outputs.py` is pointed at real predictions.

`ml/results/harness_smoke.json` is different. It scores a replay of the rule labels on the small committed fixture. Those numbers check the metric script. They are not Qwen quality.

The NestJS chain is local model, then Gemini, then rules. See [Which path runs](#11-how-the-nestjs-backend-uses-the-model). Render does not have a GPU, and this repo does not ship an adapter, so the hosted API cannot be serving the 3B model unless a separate model server is configured. The response field `generationSource` is the source of truth for a given request.

## 1. What the model is for

The local model is not a general chatbot. It is a narrow structured-generation model for park safety and trail-condition summaries.

Its job is to read park context such as:

- park identity and seasonal profile
- weather signals
- active NPS alerts
- derived hazard hints

and return one JSON object in a fixed schema:

- `riskLevel`
- `hazards`
- `alerts`
- `notification`
- `recommendedAction`

This makes the model suitable for:

- consistent park digest generation
- structured safety notifications
- downstream rendering in the frontend and API
- deterministic validation before a response is accepted

The schema is defined in [`backend/trailcheck-api/ml/inference/schema.py`](../backend/trailcheck-api/ml/inference/schema.py).

## 2. High-level architecture

The local model flow looks like this:

1. Historical park weather and NPS alert data are processed into structured examples.
2. Rule-based logic creates target hazard labels and visitor guidance.
3. Those examples are turned into chat-style supervised fine-tuning records.
4. A QLoRA adapter is trained on top of a small instruct base model.
5. At runtime, the backend builds fresh live context from NPS, NWS, and the internal hazard engine.
6. The local model tries to generate a schema-valid JSON payload.
7. If local generation fails validation or the adapter is missing, the backend falls back to Gemini or to a non-LLM summary.

This pipeline is split across these areas:

- training and dataset creation: [`backend/trailcheck-api/ml/`](../backend/trailcheck-api/ml/)
- runtime integration: [`backend/trailcheck-api/src/ai/`](../backend/trailcheck-api/src/ai/)
- seasonal hazard logic: [`backend/trailcheck-api/src/hazards/`](../backend/trailcheck-api/src/hazards/)

## 3. Base model and fine-tuning strategy

The primary base model configured in the repo is:

- `Qwen/Qwen2.5-3B-Instruct`

Configured alternatives are:

- `microsoft/Phi-3.5-mini-instruct`
- `meta-llama/Llama-3.2-3B-Instruct`

These are defined in [`backend/trailcheck-api/ml/configs/trailcheck_qlora_4060.yaml`](../backend/trailcheck-api/ml/configs/trailcheck_qlora_4060.yaml).

### Why this model family

The local ML README explicitly recommends `Qwen/Qwen2.5-3B-Instruct` because it is a strong small instruct model that remains realistic to fine-tune locally with QLoRA on a single RTX 4060-class GPU. The design goal is not frontier-model quality. The goal is a practical small model that can:

- follow strict JSON instructions
- stay affordable to train locally
- be deployed as a lightweight structured-output component

### Why QLoRA

The training stack uses:

- 4-bit quantized base model loading
- LoRA adapters for parameter-efficient tuning
- TRL `SFTTrainer` for supervised fine-tuning

This keeps VRAM requirements much lower than full-model fine-tuning while still allowing the model to learn the TrailCheck output format and domain behavior.

## 4. What the model is trained on

The model is trained on synthetic but structured supervision derived from park weather, park metadata, and NPS alerts.

The training set is not built from human-written annotations stored in the repo. Instead, it is generated automatically by code in [`backend/trailcheck-api/ml/data/build_dataset.py`](../backend/trailcheck-api/ml/data/build_dataset.py).

### 4.1 Primary source files

The training config points the dataset builder at these inputs:

- `data/processed/parks/park_weather_hazards_2024.csv`
- `data/processed/parks/nps_alerts_normalized.csv`
- `data/processed/parks/park_weather_alerts_current.csv`

Those paths are configured in [`backend/trailcheck-api/ml/configs/trailcheck_qlora_4060.yaml`](../backend/trailcheck-api/ml/configs/trailcheck_qlora_4060.yaml).

### 4.2 Weather source lineage

The weather lineage is implemented through the scripts in `backend/trailcheck-api/scripts/`:

1. [`process_weather.py`](../backend/trailcheck-api/scripts/process_weather.py)
   Reads a compressed raw weather file for 2024 from `data/raw/weather/2024.csv.gz`.

2. The script filters to the weather elements TrailCheck cares about:
   `TMAX`, `TMIN`, `PRCP`, and `SNOW`.

3. It pivots the raw NOAA-style row format into one row per station/date and converts values into:
   `TMAX` and `TMIN` in degrees C, `PRCP` in mm, and `SNOW` in mm.

4. [`merge_parks_weather.py`](../backend/trailcheck-api/scripts/merge_parks_weather.py)
   joins the cleaned weather data to a park-to-station mapping file: `data/processed/parks/park_station_map.csv`.

5. [`generate_hazards.py`](../backend/trailcheck-api/scripts/generate_hazards.py)
   creates a first-pass hazard list such as `FLOOD_RISK`, `MUDDY`, `SNOW`, and `HEAT` from weather thresholds.

The result is the park-level weather+hazards file used by the ML dataset builder.

### 4.3 NPS alert source lineage

The alert lineage is implemented through the NPS scripts:

1. [`fetch_alerts.py`](../backend/trailcheck-api/scripts/nps/fetch_alerts.py)
   fetches park alert snapshots from the NPS Alerts API.

2. Raw snapshots are saved under `data/raw/nps/alerts/`.

3. [`normalize_alerts.py`](../backend/trailcheck-api/scripts/nps/normalize_alerts.py)
   flattens the NPS payloads into a normalized CSV with fields like:
   `park_slug`, `park_code`, `title`, `category`, `start_date`, `end_date`, `description`, and `snapshot_at`.

4. [`merge_alerts_weather.py`](../backend/trailcheck-api/scripts/nps/merge_alerts_weather.py)
   produces a park-level file with the current alert snapshot attached to each weather row.

This gives the dataset builder both date-ranged historical-ish alert records and a current-alert fallback file.

### 4.4 Park metadata and hazard profiles

The training pipeline also depends on park-specific metadata defined in [`backend/trailcheck-api/ml/data/park_profiles.py`](../backend/trailcheck-api/ml/data/park_profiles.py).

Each park is mapped to:

- a park code
- a hazard profile such as `desert`, `alpine`, `coastal`, or `swamp_wetland`
- a hemisphere for season resolution

These park profiles matter because the same weather conditions should be interpreted differently across environments. For example:

- heat matters more in exposed desert and canyon parks
- snow and freeze-thaw matter more in alpine and subarctic parks
- flooding and mud matter more in wetland and temperate forest parks
- marine hazards matter more in coastal and island parks

There is a parallel runtime registry in [`backend/trailcheck-api/src/parks/park-registry.ts`](../backend/trailcheck-api/src/parks/park-registry.ts), which helps keep training-time and runtime park semantics aligned.

## 5. How labels are created

TrailCheck does not store a hand-labeled training corpus in the repo. Instead, the builder creates targets with deterministic rules.

This is important because the model is being trained to imitate a structured decision policy, not free-form human prose.

### 5.1 Alert selection

For each park/date weather row, the dataset builder:

- tries to select alerts whose `start_date <= observed_date <= end_date`
- if none match and fallback is enabled, it attaches alerts from the latest current snapshot for that park
- limits alert count per example using `max_alerts_per_example`

That logic lives in `select_active_alerts()` in [`build_dataset.py`](../backend/trailcheck-api/ml/data/build_dataset.py).

### 5.2 Hazard derivation

The builder combines three sources of hazard evidence:

1. Existing simple rule labels already present in the weather CSV.
2. Derived weather hazards based on thresholds for temperature, precipitation, snow, season, and park profile.
3. Alert-derived hazards based on keyword matching in NPS alert titles, categories, and descriptions.

Examples of hazard types the builder can produce include:

- `HEAT`
- `DEHYDRATION`
- `WILDFIRE`
- `AIR_QUALITY`
- `SNOW_ICE`
- `FLOODING`
- `MUD`
- `HIGH_WIND`
- `LIGHTNING`
- `TRAIL_CLOSURE`
- `COLD`
- `COASTAL_HAZARD`

Severity is ranked as:

- `LOW`
- `MODERATE`
- `HIGH`
- `EXTREME`

The builder uses severity merging logic so the strongest signal wins when multiple rules point at the same hazard.

### 5.3 Risk level, notification, and action generation

Once hazards and alerts are assembled, the dataset builder computes:

- overall `riskLevel`
- a concise `notification`
- a practical `recommendedAction`

This logic is also heuristic. For example:

- multiple high hazards can escalate the overall risk level
- park closure alerts can force the risk higher
- recommended actions are chosen from a predefined mapping tied to hazard type

The final target object is validated against the strict output schema before it is written to disk.

### 5.4 Resulting training example structure

Every example is stored as a chat conversation with:

- a system prompt
- a user message containing the JSON context
- an assistant message containing the target JSON

The system prompt is in [`backend/trailcheck-api/ml/data/prompts.py`](../backend/trailcheck-api/ml/data/prompts.py). It explicitly instructs the model to:

- return one valid JSON object only
- use only the provided facts
- include exactly the required top-level keys
- keep `hazards` and `alerts` as arrays even when empty

This is a strong signal that TrailCheck is optimizing for schema fidelity more than for expressive writing style.

## 6. What an input example contains

The training-time context generated by `build_dataset.py` contains fields like:

- `parkName`
- `parkCode`
- `parkSlug`
- `date`
- `season`
- `hazardProfile`
- `weather.maxTempC`
- `weather.maxTempF`
- `weather.minTempC`
- `weather.minTempF`
- `weather.precipitationMm`
- `weather.snowMm`
- `derivedHazardSignals`
- `activeAlerts`
- `alertContextMode`

This context is then serialized into the user turn of the SFT example.

## 7. Train/validation splitting

The dataset is split by park code, not by random global shuffle.

The logic in `split_examples()`:

- groups records by `parkCode`
- sorts them by date
- allocates the last portion of each park's records to validation
- uses `validation_ratio: 0.15`
- guarantees at least one validation record per park

This is a sensible design because it prevents validation from being dominated by only the largest parks and keeps every park represented.

Generated files include:

- `ml/data/outputs/all.jsonl`
- `ml/data/outputs/train.jsonl`
- `ml/data/outputs/validation.jsonl`
- `ml/data/outputs/manifest.json`
- `ml/data/outputs/sample_input.json`

### 7.1 Recorded dataset split, not model metrics

Commit `ae20b74` ("model metrics") recorded dataset split counts only. It did not record JSON-valid rate, risk accuracy, or hazard F1 for a trained model.

The recorded full build, which is **not** committed as JSONL, was:

- 660 rule-generated examples
- 560 train / 100 validation
- 2 parks: `big-bend` 366, `yosemite` 294
- dates in that build: 2024-01-01 through 2024-12-31
- every row used `park_current_fallback` for alert context

Do not quote the risk mix from that build (`MODERATE` 349, `HIGH` 7, `EXTREME` 304) as model performance. It describes the rule labels. Rebuild the processed CSVs and run `build_dataset.py` if you need to recompute it. The committed fixture under `ml/data/fixtures/` is a few rows for the CPU smoke test, not that 660-row set.

## 8. Exact training configuration

The current YAML config specifies the following settings.

### 8.1 Quantization

| Setting | Value |
| --- | --- |
| `load_in_4bit` | `true` |
| `bnb_4bit_quant_type` | `nf4` |
| `bnb_4bit_use_double_quant` | `true` |
| `bnb_4bit_compute_dtype` | `float16` |

### 8.2 LoRA

| Setting | Value |
| --- | --- |
| `r` | `16` |
| `alpha` | `32` |
| `dropout` | `0.05` |
| `bias` | `none` |
| target modules | `q_proj`, `k_proj`, `v_proj`, `o_proj`, `gate_proj`, `up_proj`, `down_proj` |

### 8.3 Training arguments

| Setting | Value |
| --- | --- |
| output dir | `ml/models/trailcheck-qwen25-3b-json` |
| max sequence length | `1024` |
| per-device train batch size | `1` |
| per-device eval batch size | `1` |
| gradient accumulation steps | `16` |
| learning rate | `2e-4` |
| epochs | `3` |
| warmup ratio | `0.05` |
| weight decay | `0.01` |
| max grad norm | `0.3` |
| scheduler | `cosine` |
| fp16 | `true` |
| bf16 | `false` |
| gradient checkpointing | `true` |
| optimizer | `paged_adamw_8bit` |
| seed | `42` |

These settings are implemented in [`backend/trailcheck-api/ml/training/train_sft.py`](../backend/trailcheck-api/ml/training/train_sft.py).

### 8.4 Training stack dependencies

The Python requirements include:

- `transformers`
- `trl`
- `peft`
- `bitsandbytes`
- `datasets`
- `accelerate`
- `pydantic`
- `pandas`

See [`backend/trailcheck-api/ml/requirements.txt`](../backend/trailcheck-api/ml/requirements.txt).

## 9. How training is implemented in code

The training entrypoint is [`backend/trailcheck-api/ml/training/train_sft.py`](../backend/trailcheck-api/ml/training/train_sft.py).

The main steps are:

1. Load the YAML config.
2. Load tokenizer for the base model.
3. Ensure a pad token exists.
4. Load the base model in 4-bit quantized form.
5. Prepare the model for k-bit training.
6. Load `train.jsonl` and `validation.jsonl` with Hugging Face Datasets.
7. Convert each example's `messages` array into a single training text string.
8. Create a LoRA config.
9. Fine-tune with TRL `SFTTrainer`.
10. Save the adapter and tokenizer into `ml/models/trailcheck-qwen25-3b-json`.

One implementation detail worth noting: if the tokenizer has a chat template, the code uses it. Otherwise it falls back to a simple role-tagged rendering:

- `SYSTEM:`
- `USER:`
- `ASSISTANT:`

That makes the pipeline portable across different base models.

## 10. How local inference works

Local inference is implemented in [`backend/trailcheck-api/ml/inference/generate_local.py`](../backend/trailcheck-api/ml/inference/generate_local.py).

### 10.1 Inference process

At inference time the code:

1. Loads the same base model tokenizer.
2. Loads the quantized base model.
3. Loads the saved PEFT adapter on top of the base model.
4. Builds a generation prompt from the system message and the user context.
5. Runs generation with deterministic settings.
6. Validates the resulting JSON.
7. Optionally attempts one repair pass if validation fails.

### 10.2 Generation settings

The configured defaults are:

- `max_new_tokens: 384`
- `temperature: 0.0`
- `top_p: 1.0`
- `repetition_penalty: 1.02`
- `do_sample: false`
- `repair_attempts: 1`
- `validation_required: true`

This is intentionally conservative. The local model is meant to behave more like a structured function than a creative assistant.

### 10.3 Validation layer

The validation layer is one of the most important parts of this design.

[`backend/trailcheck-api/ml/inference/validator.py`](../backend/trailcheck-api/ml/inference/validator.py) does all of the following:

- extracts the first JSON object from messy model output
- parses JSON
- normalizes case for risk and severity labels
- validates against the Pydantic schema
- returns structured validation errors when output is invalid

This means the backend can reject malformed output instead of trusting the model blindly.

## 11. How the NestJS backend uses the model

The runtime integration is centered on:

- [`backend/trailcheck-api/src/ai/local-model.service.ts`](../backend/trailcheck-api/src/ai/local-model.service.ts)
- [`backend/trailcheck-api/src/ai/ai.service.ts`](../backend/trailcheck-api/src/ai/ai.service.ts)

### 11.1 LocalModelService

`LocalModelService` is a TypeScript wrapper around the Python inference script.

It:

- writes the runtime input to a temporary JSON file
- invokes Python with `generate_local.py`
- passes config path, adapter path, and input path
- parses stdout
- normalizes the returned payload
- recommends fallback if anything goes wrong

It also performs readiness checks before attempting inference:

- script exists
- config exists
- adapter directory contains `adapter_config.json`

This is important because the repo currently does not include a trained adapter. Without a trained adapter, the backend will not be able to use the local model successfully.

### 11.2 AiService runtime flow

`AiService` does much more than simply call a model.

It first gathers live runtime context from:

- Prisma park metadata
- NPS alerts
- weather service output
- `HazardsService` seasonal hazard assessment

Then it builds a local-model input object and tries the local model first.

If local generation succeeds:

- the API response uses `generationSource: "local"`
- the structured output is used to build the answer and park digest

If local generation fails:

- the service records the failure message
- it tries Gemini if `GEMINI_API_KEY` is configured
- otherwise it falls back to a simple rule-based answer built from hazards, alerts, or forecast text

This means TrailCheck uses a tiered generation strategy:

1. local structured model
2. Gemini
3. non-LLM fallback

### 11.3 API endpoints affected

The AI controller exposes:

- `POST /ai/ask`
- `GET /ai/parks/:parkSlug/digest`

The local model influences both endpoints whenever a trained adapter is available and validation succeeds.

## 12. Relationship to the hazard engine

A subtle but important point in this repo is that the local model does not operate in isolation.

TrailCheck already has a fairly rich rules-based hazard engine in:

- [`backend/trailcheck-api/src/hazards/hazards.service.ts`](../backend/trailcheck-api/src/hazards/hazards.service.ts)
- [`backend/trailcheck-api/src/hazards/hazard-profiles.ts`](../backend/trailcheck-api/src/hazards/hazard-profiles.ts)

That hazard engine:

- derives weather features from live forecast text
- combines seasonal park profiles with weather and alert evidence
- assigns hazard scores and severities
- produces a park risk level

The local model is therefore best understood as a structured summarizer and normalizer on top of domain signals, not as the sole source of truth for park safety reasoning.

## 13. Training/runtime mismatch to be aware of

One of the most important implementation details in this repository is that the runtime input is richer than the training input.

The training-time examples mainly contain:

- weather scalar values
- derived hazard booleans and labels
- active alerts
- park metadata

The runtime input built in `AiService` adds extra fields such as:

- forecast period arrays
- seasonal assessment risk level
- ignored hazards
- a full `seasonalAssessment.activeHazards` array

This is not necessarily wrong because the prompt simply asks the model to use the provided facts, and extra context can still help. But it does create a distribution shift:

- the model was trained on one context shape
- at inference it may receive a larger and richer context shape

That should be documented because it affects output reliability and future retraining decisions.

## 14. Evaluation strategy

Offline evaluation is implemented in [`backend/trailcheck-api/ml/evaluation/evaluate_outputs.py`](../backend/trailcheck-api/ml/evaluation/evaluate_outputs.py).

The script compares predictions against the gold validation set and reports metrics including:

- schema validity
- risk level accuracy
- hazard precision
- hazard recall
- hazard F1
- alert recall
- notification clarity
- condition consistency

It can compare multiple systems at once, including:

- local model predictions
- Gemini predictions exported in matching format

This is a good fit for TrailCheck because accuracy is not only about matching a single label. The project also cares about:

- JSON validity
- capturing the right hazard types
- preserving actionable visitor guidance

## 15. Current repository state

What is in git:

- dataset builder, QLoRA config, training script, inference code, and the metric script
- a small fixture CSV set and `ml/configs/trailcheck_smoke.yaml` for a CPU smoke test
- `ml/results/model_eval.json` with status `not yet run`
- `ml/models/.gitkeep` only. No `adapter_config.json`

What is not in git:

- the 660-row JSONL from the two-park build
- the processed NOAA and NPS source files (`backend/trailcheck-api/data/` is gitignored)
- any QLoRA adapter from the reported RTX 4060 run

The local path is not runnable from a clean clone until someone trains an adapter or points `LOCAL_MODEL_ADAPTER_PATH` at one. Until then the API uses Gemini when `GEMINI_API_KEY` is set, and the rules summary otherwise. `LOCAL_MODEL_ENABLED` defaults to true in code, but the server transport then fails closed when nothing is listening on the model port.

## 16. Limitations and tradeoffs

This design is sensible, but it has some important limitations.

### 16.1 Labels are synthetic

The gold outputs are generated by heuristics, not by domain experts labeling examples manually. So the model is learning to imitate the rule system and label-generation policy.

That is useful for consistency, but it also means:

- the model cannot exceed the quality ceiling of the label generator very much
- any systematic rule bias will be learned
- evaluation against the same rule-generated targets can overestimate real-world usefulness

### 16.2 No adapter artifact in repo

The code is ahead of the committed model assets. That is fine for development, but it should be communicated clearly to anyone cloning the project.

### 16.3 Historic training inputs vs live runtime inputs

The training set is built from 2024 processed files, while runtime inference uses live NPS and NWS context. That is operationally appropriate, but it means the training distribution is only an approximation of runtime conditions.

### 16.4 Structured JSON is prioritized over narrative quality

This is intentional, not a bug. The model is optimized for correctness of fields and practical summaries more than for stylistic richness.

## 17. How to rebuild the model

The intended workflow is:

1. Build the processed park weather and NPS alert files.
2. Generate the structured SFT dataset.
3. Train the QLoRA adapter.
4. Run local inference on validation or sample inputs.
5. Evaluate predictions against the gold validation set.

The commands documented in the repo are:

```powershell
python backend/trailcheck-api/ml/data/build_dataset.py --config backend/trailcheck-api/ml/configs/trailcheck_qlora_4060.yaml
python backend/trailcheck-api/ml/training/train_sft.py --config backend/trailcheck-api/ml/configs/trailcheck_qlora_4060.yaml
python backend/trailcheck-api/ml/inference/generate_local.py --config backend/trailcheck-api/ml/configs/trailcheck_qlora_4060.yaml --adapter-path backend/trailcheck-api/ml/models/trailcheck-qwen25-3b-json --input-json backend/trailcheck-api/ml/data/outputs/sample_input.json
python backend/trailcheck-api/ml/evaluation/evaluate_outputs.py --gold backend/trailcheck-api/ml/data/outputs/validation.jsonl --predictions local=backend/trailcheck-api/ml/data/outputs/local_predictions.jsonl
```

## 18. Environment variables for runtime use

The ML README recommends these backend variables:

```env
LOCAL_MODEL_ENABLED=true
LOCAL_MODEL_PYTHON_BIN=python
LOCAL_MODEL_SCRIPT=ml/inference/generate_local.py
LOCAL_MODEL_CONFIG=ml/configs/trailcheck_qlora_4060.yaml
LOCAL_MODEL_ADAPTER_PATH=ml/models/trailcheck-qwen25-3b-json
LOCAL_MODEL_TIMEOUT_MS=90000
```

These settings are what allow the NestJS service to call the Python model runner.

One subtle runtime detail: in the current `LocalModelService` implementation, the local path is treated as enabled unless `LOCAL_MODEL_ENABLED` is explicitly set to `false`.

## 19. Important files to know

If someone wants to understand or extend the model pipeline, these are the highest-signal files:

- [`backend/trailcheck-api/ml/README.md`](../backend/trailcheck-api/ml/README.md)
- [`backend/trailcheck-api/ml/configs/trailcheck_qlora_4060.yaml`](../backend/trailcheck-api/ml/configs/trailcheck_qlora_4060.yaml)
- [`backend/trailcheck-api/ml/data/build_dataset.py`](../backend/trailcheck-api/ml/data/build_dataset.py)
- [`backend/trailcheck-api/ml/data/prompts.py`](../backend/trailcheck-api/ml/data/prompts.py)
- [`backend/trailcheck-api/ml/data/park_profiles.py`](../backend/trailcheck-api/ml/data/park_profiles.py)
- [`backend/trailcheck-api/ml/training/train_sft.py`](../backend/trailcheck-api/ml/training/train_sft.py)
- [`backend/trailcheck-api/ml/inference/generate_local.py`](../backend/trailcheck-api/ml/inference/generate_local.py)
- [`backend/trailcheck-api/ml/inference/validator.py`](../backend/trailcheck-api/ml/inference/validator.py)
- [`backend/trailcheck-api/src/ai/local-model.service.ts`](../backend/trailcheck-api/src/ai/local-model.service.ts)
- [`backend/trailcheck-api/src/ai/ai.service.ts`](../backend/trailcheck-api/src/ai/ai.service.ts)
- [`backend/trailcheck-api/src/hazards/hazards.service.ts`](../backend/trailcheck-api/src/hazards/hazards.service.ts)

There is also an older and much simpler prototype dataset script at [`backend/trailcheck-api/scripts/build_dataset.py`](../backend/trailcheck-api/scripts/build_dataset.py). The active structured local-model pipeline is the one under `backend/trailcheck-api/ml/`.

## 20. Bottom line

TrailCheck's model story is a hybrid that should be described in that order:

- deterministic hazard rules and rule-generated supervised examples, not a hand-labeled corpus
- a QLoRA training config for Qwen2.5-3B-Instruct on one consumer GPU
- no adapter and no model scores in this repository
- strict JSON validation when a local model is actually running
- a live backend chain: local model, then Gemini, then rules

The hosted app on Vercel and Render is the full-stack product. It is not, by itself, evidence that the 3B model is serving traffic.
