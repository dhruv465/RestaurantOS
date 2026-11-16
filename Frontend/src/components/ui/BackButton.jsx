import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const BackButton = () => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(-1)}
      aria-label="Go back" title="Go back"
      className="back-button h-10 w-10 shrink-0 flex items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--card-bg)] text-[var(--text-color)] hover:border-[#F6b100] transition-colors"
    >
      <ArrowLeft size={20} aria-hidden="true" />
    </button>
  );
};

export default BackButton;
