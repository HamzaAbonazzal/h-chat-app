import LanguageToggle from "./LanguageToggle";
import ThemeToggleCompact from "./ThemeToggleCompact";

/**
 * شريط أدوات صفحات المصادقة.
 * 
 * ⭐ الحل: حاوية بعرض كامل + justify-content-end
 * - في LTR: الأزرار على اليمين
 * - في RTL: الأزرار على اليسار
 * - `pointer-events: none` على الحاوية → لا تحجب المحتوى
 * - `pointer-events: auto` على الأزرار → تعمل بشكل طبيعي
 */
const AuthToolbar = () => {
  return (
    <div
      className="auth-toolbar-wrapper position-fixed w-100 d-flex justify-content-end"
      style={{
        top: "1rem",
        insetInlineStart: 0,
        insetInlineEnd: 0,
        paddingInline: "1rem",
        zIndex: 1050,
        pointerEvents: "none",
      }}
    >
      <div
        className="auth-toolbar d-flex gap-2"
        style={{
          pointerEvents: "auto",
          maxWidth: "100%",
        }}
      >
        <ThemeToggleCompact />
        <LanguageToggle />
      </div>
    </div>
  );
};

export default AuthToolbar;