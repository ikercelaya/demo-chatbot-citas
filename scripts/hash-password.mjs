#!/usr/bin/env node
/**
 * Genera un hash bcrypt para una contraseña.
 * Uso:  node scripts/hash-password.mjs "miContraseña"
 *       npm run hash -- "miContraseña"
 *
 * Pega el hash resultante en la columna password_hash de la tabla `usuarios`.
 */
import bcrypt from 'bcryptjs';

const password = process.argv[2];
if (!password) {
  console.error('Uso: node scripts/hash-password.mjs "<contraseña>"');
  process.exit(1);
}

const hash = await bcrypt.hash(password, 10);
console.log(hash);
