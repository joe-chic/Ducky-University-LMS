export const permisosIniciales = {
  Administrador: {
    usuarios: { alta: true, baja: true, edicion: true },
    libros: { alta: true, baja: true, edicion: true }
  },
  Bibliotecario: {
    usuarios: { alta: false, baja: false, edicion: false },
    libros: { alta: true, baja: true, edicion: true, prestamo: false, devolver: false, compra: false }
  },
  Profesor: {
    usuarios: { alta: false, baja: false, edicion: false },
    libros: { alta: false, baja: false, edicion: false, prestamo: true, devolver: true, compra: true }
  },
  Alumno: {
    usuarios: { alta: false, baja: false, edicion: false },
    libros: { alta: false, baja: false, edicion: false, prestamo: true, devolver: true, compra: true }
  },
  Colaborador: {
    usuarios: { alta: false, baja: false, edicion: false },
    libros: { alta: false, baja: false, edicion: false, prestamo: true, devolver: true, compra: true }
  },
};