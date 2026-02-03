---
description: Actualizar la versión de la aplicación para saltar la caché
---

Este workflow asegura que todos los usuarios (móvil y PC) reciban los últimos cambios de código y estilos.

1.  **Actualizar index.html**:
    - Busca el parámetro `?v=X.X` en los archivos `styles.css` y `app.js`.
    - Incrementa el número de versión (ej: de `1.0` a `1.1`).
    - Actualiza los textos `vX.X` en el sidebar y menú móvil.

2.  **Desplegar**:
    // turbo - Ejecuta `firebase deploy --only hosting` para subir los cambios.

3.  **Verificar**:
    - Abre la web y confirma que el marcador inferior muestra la nueva versión.
