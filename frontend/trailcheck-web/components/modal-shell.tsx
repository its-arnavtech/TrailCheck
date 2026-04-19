type ModalShellProps = {
  children: React.ReactNode;
  onClose: () => void;
  widthClassName?: string;
};

export default function ModalShell({
  children,
  onClose,
  widthClassName = 'max-w-md',
}: ModalShellProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(4,10,14,0.72)] p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className={`relative w-full ${widthClassName}`}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
