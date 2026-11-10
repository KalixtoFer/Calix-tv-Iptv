# Panel de administración de Calix TV

La app **no trae ningún servidor IPTV escrito**. El servidor se carga desde este panel y la app lo lee de
Firestore (`config/servidor`) cada vez que arranca. Sin servidor cargado, los clientes ven
"Servicio no disponible".

- Panel: `https://influential-iris-f6shk.web.app` (carpeta `admin/`, Firebase Hosting)
- Datos: Firestore, proyecto `influential-iris-f6shk`
- Login del panel: Google. Solo entran las cuentas que figuren en la colección `admins`.

## Puesta en marcha (una sola vez)

### 1. Activar Firestore
Firebase Console → **Firestore Database** → *Crear base de datos* → ubicación a elección → **modo producción**.

### 2. Activar el login con Google
Firebase Console → **Authentication** → *Comenzar* → pestaña *Sign-in method* → **Google** → Habilitar → elegí un
email de soporte → Guardar.

### 3. Publicar las reglas de seguridad
Firebase Console → Firestore Database → pestaña **Reglas** → borrá todo, pegá el contenido de
[`firestore.rules`](../firestore.rules) → **Publicar**.

### 4. Publicar el panel
Elegí **una** de las dos formas:

**A) Con GitHub Actions (recomendada, queda automático)**
1. Firebase Console → ⚙️ Configuración del proyecto → **Cuentas de servicio** → *Generar nueva clave privada*.
   Se descarga un archivo `.json`. **Es una clave secreta: no la subas al repo ni la pegues en ningún chat.**
2. GitHub → tu repo → Settings → Secrets and variables → Actions → *New repository secret*.
   Nombre: `FIREBASE_SERVICE_ACCOUNT`. Valor: todo el contenido del `.json`.
3. Pestaña **Actions** → *Publicar panel de admin (Firebase Hosting)* → **Run workflow**.

**B) Desde tu PC, con la CLI de Firebase**
```
npm install -g firebase-tools
firebase login
firebase deploy --only hosting
```

### 5. Autorizar tu cuenta como administrador
1. Abrí `https://influential-iris-f6shk.web.app` y entrá con Google.
2. El panel te va a mostrar tu **UID** y que falta autorizar la cuenta.
3. Firestore Database → Datos → *Iniciar colección* → ID de colección **`admins`** →
   **ID del documento = tu UID** → agregá un campo cualquiera (ej. `rol` = `admin`) → Guardar.
4. Volvé al panel y tocá **Ya lo hice, verificar**.

### 6. Cargar el servidor
En el panel escribí la dirección del servidor IPTV (ej. `http://servidor.com:8080`) y tocá **Guardar**.

## Qué NO hacer
- No cargues usuarios ni contraseñas de clientes en el panel: el documento `config/servidor` es de lectura pública
  (la app lo necesita antes del login).
- No subas al repo la clave de cuenta de servicio ni archivos con contraseñas.
- No agregues más cuentas a `admins` que las tuyas.

## Cómo funciona la seguridad
- La clave web (`apiKey`) de Firebase es pública por diseño; lo que protege los datos son las reglas de `firestore.rules`.
- Cualquiera puede leer `config/servidor` (y solo ese documento). Solo escribe quien tenga documento en `admins/<su UID>`,
  y ese documento solo se puede crear a mano desde Firebase Console.
- Si algún día querés cortar el servicio de golpe: botón **Desactivar servicio** en el panel.
