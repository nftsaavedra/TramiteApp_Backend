import * as Joi from 'joi';

/**
 * Esquema de validación de variables de entorno
 * Garantiza que todas las variables críticas estén presentes al iniciar la aplicación
 */
export const validationSchema = Joi.object({
  // Base de datos (requerida)
  DATABASE_URL: Joi.string()
    .uri()
    .required()
    .messages({
      'string.uri': 'DATABASE_URL debe ser una URI válida de PostgreSQL',
      'any.required': 'DATABASE_URL es requerida para conectar a la base de datos',
    }),

  // Puerto del servidor (opcional, default 3000)
  PORT: Joi.number()
    .integer()
    .min(1024)
    .max(65535)
    .default(3000)
    .messages({
      'number.min': 'PORT debe estar entre 1024 y 65535',
      'number.max': 'PORT debe estar entre 1024 y 65535',
    }),

  // JWT Secret (requerido, mínimo 32 caracteres)
  JWT_SECRET: Joi.string()
    .min(32)
    .required()
    .messages({
      'string.min': 'JWT_SECRET debe tener al menos 32 caracteres para seguridad adecuada',
      'any.required': 'JWT_SECRET es requerida para firmar tokens de autenticación',
    }),

  // JWT Expiration (opcional, default 1d)
  JWT_EXPIRES_IN: Joi.string()
    .pattern(/^[0-9]+[smhd]$/)
    .default('1d')
    .messages({
      'string.pattern.base': 'JWT_EXPIRES_IN debe estar en formato válido (ej: 1h, 30m, 7d)',
    }),

  // CORS Origin (requerido)
  CORS_ORIGIN: Joi.string()
    .required()
    .messages({
      'any.required': 'CORS_ORIGIN es requerida para configurar políticas de origen cruzado',
    }),

  // Redis URL (opcional)
  REDIS_URL: Joi.string()
    .uri()
    .optional()
    .messages({
      'string.uri': 'REDIS_URL debe ser una URI válida si está configurada',
    }),

  // Rate Limiting (opcional, con defaults seguros)
  THROTTLE_TTL: Joi.number()
    .integer()
    .min(1000)
    .default(60000)
    .messages({
      'number.min': 'THROTTLE_TTL debe ser al menos 1000ms (1 segundo)',
    }),

  THROTTLE_LIMIT: Joi.number()
    .integer()
    .min(1)
    .default(20)
    .messages({
      'number.min': 'THROTTLE_LIMIT debe ser al menos 1 request',
    }),
});
