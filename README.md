# Pro Strength Irun · Chat demo

Demo de chatbot sin base de datos para que clientes puedan probar un asistente
web sencillo.

## Que incluye

- Chat publico en `/`.
- Login de administrador en `/login`.
- Panel de conversaciones en `/dashboard/conversations`.
- Usuario y contrasena por defecto: `admin` / `admin`.
- Registro temporal de conversaciones sin Supabase ni ninguna BBDD.
- Pausa automatica del bot si el cliente pide hablar con una persona.
- Pausa o reactivacion manual del bot desde el panel.
- Respuesta manual del equipo desde el panel.

## Datos del negocio usados por el bot

- Empresa: Pro Strength Irun.
- Web: https://prostrengthirun.es/
- Direccion: Letxumborro Hiribidea, 83, Irun.
- Telefono/WhatsApp: +34 699 84 51 99.
- Actividad: gimnasio de entrenamiento de fuerza.
- Instalaciones: 600 m2, peso libre, maquinas profesionales, mancuernas hasta
  60 kg, cruce de poleas, aire acondicionado y aparcamiento exterior.
- Servicios: entrenamientos personalizados, asesoramiento nutricional,
  entrenadores certificados, Fit3D y test epigeneticos.

## Ejecutar en local

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## Desplegar en Vercel

No necesitas configurar variables de entorno.

1. Importa el repositorio en Vercel.
2. Framework: Next.js.
3. Build command: `npm run build`.
4. Deploy.

## Limitacion intencionada

Esta demo no usa base de datos. Las conversaciones se guardan en memoria dentro
del proceso de Next.js. Es suficiente para ensenar el flujo, pero no debe usarse
como almacenamiento permanente.
