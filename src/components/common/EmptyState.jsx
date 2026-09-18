const EmptyState = ({ icon, title, description, action = null }) => {
  return (
    <div className="d-flex flex-column justify-content-center align-items-center h-100 text-center p-4">
      {icon && (
        <div
          className="mb-4 d-flex align-items-center justify-content-center rounded-circle"
          style={{
            width: "100px",
            height: "100px",
            background:
              "linear-gradient(135deg, rgba(0,128,105,0.1), rgba(0,168,132,0.05))",
            animation: "emptyStateFloat 3s ease-in-out infinite",
          }}
        >
          <i
            className={`bi ${icon}`}
            style={{
              fontSize: "2.5rem",
              color: "#008069",
              opacity: 0.7,
            }}
          ></i>
        </div>
      )}
      {title && (
        <h5 className="mb-2 fw-semibold" style={{ fontSize: "1.1rem" }}>
          {title}
        </h5>
      )}
      {description && (
        <p className="text-muted mb-4" style={{ maxWidth: "320px", fontSize: "0.9rem" }}>
          {description}
        </p>
      )}
      {action}

      <style>{`
        @keyframes emptyStateFloat {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-6px);
          }
        }
      `}</style>
    </div>
  );
};

export default EmptyState;