import { Form } from "react-bootstrap";

/**
 * ⭐ حقل إدخال مع أيقونة داخلية — يعمل بشكل صحيح في RTL و LTR.
 * الأيقونة على "بداية" الحقل:
 * - LTR: يسار
 * - RTL: يمين
 */
const InputField = ({
  type = "text",
  name,
  value,
  onChange,
  placeholder,
  label,
  icon,
  error,
  disabled,
  autoComplete,
  autoFocus,
  maxLength,
  endAdornment, // ⭐ عنصر في نهاية الحقل (مثل زر إظهار كلمة المرور)
}) => {
  return (
    <Form.Group className="mb-3">
      {label && (
        <Form.Label className="small fw-semibold">{label}</Form.Label>
      )}

      <div className="input-field-wrapper">
        {/* ⭐ الأيقونة في البداية */}
        {icon && (
          <span className="input-field-icon">
            <i className={`bi ${icon}`}></i>
          </span>
        )}

        <Form.Control
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          maxLength={maxLength}
          isInvalid={!!error}
          className={`input-field-control ${icon ? "has-start-icon" : ""} ${
            endAdornment ? "has-end-adornment" : ""
          }`}
        />

        {/* ⭐ عنصر في النهاية (مثل زر إظهار كلمة المرور) */}
        {endAdornment && (
          <span className="input-field-end">{endAdornment}</span>
        )}
      </div>

      {error && <div className="text-danger small mt-1">{error}</div>}
    </Form.Group>
  );
};

export default InputField;