// Muestra el error de la API junto con la regla de negocio que se violó (ej. RN-12).
export default function ErrorBox({ error }) {
  if (!error) return null;
  return (
    <div className="alert error" role="alert">
      {error.message}
      {error.rule && <span className="rule">{error.rule}</span>}
    </div>
  );
}
