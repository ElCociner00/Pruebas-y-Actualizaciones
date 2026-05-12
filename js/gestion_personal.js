const tipoAltaUsuario = document.getElementById("tipoAltaUsuario");
const altaEmpleadoWrap = document.getElementById("altaEmpleadoWrap");
const altaOtroWrap = document.getElementById("altaOtroWrap");

const renderAlta = () => {
  const value = tipoAltaUsuario?.value || "";
  altaEmpleadoWrap?.classList.toggle("is-hidden", value !== "empleado");
  altaOtroWrap?.classList.toggle("is-hidden", value !== "otro");
};

tipoAltaUsuario?.addEventListener("change", renderAlta);
renderAlta();
