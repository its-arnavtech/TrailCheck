# TrailCheck Local Fine-Tuning

This folder contains the local supervised fine-tuning pipeline for TrailCheck's structured trail safety model.

## Recommended Base Model

Default:
- `Qwen/Qwen2.5-3B-Instruct`

Alternatives:
- `microsoft/Phi-3.5-mini-instruct`
- `meta-llama/Llama-3.2-3B-Instruct`

`Qwen/Qwen2.5-3B-Instruct` is the default because it is a strong 3B instruct model, works well with QLoRA, and stays realistic on a single RTX 4060 with 4-bit loading.

## Layout

- `configs/`: training and inference defaults
- `data/`: dataset building and prompt construction
- `training/`: QLoRA fine-tuning entrypoint
- `inference/`: adapter loading, generation, and JSON validation
- `evaluation/`: offline quality checks against held-out data and Gemini outputs
- `models/`: local adapter checkpoints

Generated model-ready training datasets are written to `backend/trailcheck-api/ml/data/outputs/`. Raw processed weather and alert sources stay in `backend/trailcheck-api/data/processed/`.

## Setup

1. Create and activate a Python virtual environment.
2. Install a CUDA-enabled PyTorch wheel that matches your local CUDA runtime.
3. Install the rest of the dependencies:

```powershell
pip install -r backend/trailcheck-api/ml/requirements.txt
```

## Build The Training Set

```powershell
python backend/trailcheck-api/ml/data/build_dataset.py --config backend/trailcheck-api/ml/configs/trailcheck_qlora_4060.yaml
```

## Train The Adapter

```powershell
python backend/trailcheck-api/ml/training/train_sft.py --config backend/trailcheck-api/ml/configs/trailcheck_qlora_4060.yaml
```

## Run Local Inference

Single example:

```powershell
python backend/trailcheck-api/ml/inference/generate_local.py `
  --config backend/trailcheck-api/ml/configs/trailcheck_qlora_4060.yaml `
  --adapter-path backend/trailcheck-api/ml/models/trailcheck-qwen25-3b-json `
  --input-json backend/trailcheck-api/ml/data/outputs/sample_input.json
```

Batch validation-set predictions:

```powershell
python backend/trailcheck-api/ml/inference/generate_local.py `
  --config backend/trailcheck-api/ml/configs/trailcheck_qlora_4060.yaml `
  --adapter-path backend/trailcheck-api/ml/models/trailcheck-qwen25-3b-json `
  --dataset-file backend/trailcheck-api/ml/data/outputs/validation.jsonl `
  --output-file backend/trailcheck-api/ml/data/outputs/local_predictions.jsonl
```

## Evaluate Against Gold Labels

```powershell
python backend/trailcheck-api/ml/evaluation/evaluate_outputs.py `
  --gold backend/trailcheck-api/ml/data/outputs/validation.jsonl `
  --predictions local=backend/trailcheck-api/ml/data/outputs/local_predictions.jsonl
```

To compare a Gemini export as well:

```powershell
python backend/trailcheck-api/ml/evaluation/evaluate_outputs.py `
  --gold backend/trailcheck-api/ml/data/outputs/validation.jsonl `
  --predictions local=backend/trailcheck-api/ml/data/outputs/local_predictions.jsonl `
  --predictions gemini=backend/trailcheck-api/ml/data/outputs/gemini_predictions.jsonl
```

## Backend Integration Pattern

The NestJS backend should:

1. Call the local inference script or a thin Python service with the same structured weather and alert context.
2. Require `ok: true` and a schema-valid `output` payload.
3. If validation fails, route the same context to Gemini and log the failed local output for later evaluation.
4. Store successful local outputs as future fine-tuning examples and evaluation traces.

Recommended backend environment variables:

- `LOCAL_MODEL_ENABLED=true`
- `LOCAL_MODEL_PYTHON_BIN=python`
- `LOCAL_MODEL_SCRIPT=ml/inference/generate_local.py`
- `LOCAL_MODEL_CONFIG=ml/configs/trailcheck_qlora_4060.yaml`
- `LOCAL_MODEL_ADAPTER_PATH=ml/models/trailcheck-qwen25-3b-json`
- `LOCAL_MODEL_TIMEOUT_MS=90000`
