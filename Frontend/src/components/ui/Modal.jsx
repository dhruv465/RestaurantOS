const Modal = ({ title, onClose, isOpen, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label={title}>
      {/* A tall form (delivery) scrolls inside the dialog instead of running off a phone screen. */}
      <div className="bg-[var(--card-bg)] shadow-lg w-full max-w-lg rounded-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-5 py-4 border-b border-[var(--border-color)]">
          <h2 className="text-lg text-[var(--text-color)] font-semibold">{title}</h2>
          <button
            className="text-[var(--text-color)] text-2xl leading-none px-2 hover:opacity-70"
            onClick={onClose}
            aria-label="Close" title="Close"
          >
            &times;
          </button>
        </div>

        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
