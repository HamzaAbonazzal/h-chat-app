import { Spinner } from "react-bootstrap";

const Loader = ({ fullScreen = false, size = "md", text = "" }) => {
  if (fullScreen) {
    return (
      <div
        className="d-flex flex-column justify-content-center align-items-center"
        style={{ height: "100vh", gap: "1rem" }}
      >
        <Spinner animation="border" variant="success" />
        {text && <p className="text-muted mb-0">{text}</p>}
      </div>
    );
  }

  return (
    <div className="d-flex justify-content-center align-items-center p-3">
      <Spinner animation="border" size={size} variant="success" />
    </div>
  );
};

export default Loader;