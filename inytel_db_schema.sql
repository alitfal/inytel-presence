-- ============================================================
-- INYTEL Presence — Esquema de base de datos
-- Motor: MySQL 8+
-- Codificación: utf8mb4 (soporte completo Unicode y emojis)
--
-- Tablas:
--   empleados             → Datos personales y laborales del empleado
--   usuarios              → Credenciales de acceso y rol en la aplicación
--   fichajes              → Registro de jornadas laborales (entrada/salida)
--   password_reset_tokens → Tokens temporales para recuperación de contraseña
-- ============================================================

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- ============================================================
-- Tabla: empleados
-- Almacena los datos personales y laborales de cada empleado.
-- Un empleado puede tener asociado un usuario de acceso (tabla usuarios).
-- ============================================================
DROP TABLE IF EXISTS `empleados`;
CREATE TABLE `empleados` (
  `id`               int          NOT NULL AUTO_INCREMENT,
  `nombre`           varchar(100) DEFAULT NULL,                -- Nombre completo
  `cargo`            varchar(100) DEFAULT NULL,                -- Puesto de trabajo
  `email`            varchar(100) DEFAULT NULL,                -- Email corporativo
  `telefono`         varchar(20)  DEFAULT NULL,
  `departamento`     varchar(100) DEFAULT NULL,
  `fecha_alta`       date         DEFAULT NULL,                -- Fecha de incorporación a la empresa
  `dni`              varchar(20)  DEFAULT NULL,                -- Se usa como contraseña inicial al crear el empleado
  `activo`           tinyint(1)   DEFAULT '1',                 -- 1 = activo, 0 = acceso desactivado
  `horas_semanales`  int          DEFAULT '40',                -- Jornada laboral semanal en horas
  `dias_laborables`  varchar(20)  DEFAULT '1,2,3,4,5',        -- Días de trabajo (1=lunes ... 5=viernes)
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- Tabla: usuarios
-- Credenciales de acceso a la aplicación.
-- Cada usuario puede estar vinculado a un empleado mediante empleado_id.
-- Los administradores pueden tener empleado_id = NULL.
-- ============================================================
DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id`           int          NOT NULL AUTO_INCREMENT,
  `nombre`       varchar(100) NOT NULL,
  `email`        varchar(100) NOT NULL,
  `password`     varchar(255) NOT NULL,                        -- Contraseña hasheada con bcryptjs
  `rol`          enum('admin','empleado') NOT NULL DEFAULT 'empleado',
  `empleado_id`  int          DEFAULT NULL,                    -- Referencia al empleado asociado (nullable para admins)
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `empleado_id` (`empleado_id`),
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`empleado_id`) REFERENCES `empleados` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- Tabla: fichajes
-- Registro de jornadas laborales. Modelo jornada-based:
-- una fila por día trabajado con hora de entrada y salida.
-- Las incidencias se registran cuando el empleado no fichó la salida
-- y la resuelve al día siguiente indicando el motivo y hora real.
-- ============================================================
DROP TABLE IF EXISTS `fichajes`;
CREATE TABLE `fichajes` (
  `id`                 int          NOT NULL AUTO_INCREMENT,
  `empleado_id`        int          NOT NULL,
  `fecha_entrada`      date         NOT NULL,                  -- Fecha de la jornada
  `hora_entrada`       time         NOT NULL,                  -- Hora de inicio de jornada
  `fecha_salida`       date         DEFAULT NULL,              -- Normalmente igual a fecha_entrada
  `hora_salida`        time         DEFAULT NULL,              -- NULL si la jornada está en curso
  `hora_salida_real`   time         DEFAULT NULL,              -- Hora real si se registró como incidencia
  `motivo_incidencia`  enum('olvido','error_aplicacion','otros') DEFAULT NULL, -- Motivo si no se fichó la salida
  `observaciones`      varchar(255) DEFAULT NULL,              -- Texto libre opcional de la incidencia
  `fecha_incidencia`   datetime     DEFAULT NULL,              -- Fecha y hora en que se resolvió la incidencia
  PRIMARY KEY (`id`),
  KEY `empleado_id` (`empleado_id`),
  KEY `idx_fecha_entrada` (`fecha_entrada`),                   -- Índice para acelerar consultas por fecha
  CONSTRAINT `fichajes_ibfk_1` FOREIGN KEY (`empleado_id`) REFERENCES `empleados` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================
-- Tabla: password_reset_tokens
-- Tokens temporales generados al solicitar recuperación de contraseña.
-- Cada token es de un solo uso y tiene una fecha de expiración.
-- Se eliminan en cascada si se borra el usuario asociado.
-- ============================================================
DROP TABLE IF EXISTS `password_reset_tokens`;
CREATE TABLE `password_reset_tokens` (
  `id`          int          NOT NULL AUTO_INCREMENT,
  `usuario_id`  int          NOT NULL,
  `token`       varchar(255) NOT NULL,                         -- Token único enviado por email
  `expira_en`   datetime     NOT NULL,                         -- Fecha límite de validez del token
  `usado`       tinyint(1)   DEFAULT '0',                      -- 1 = ya utilizado, no puede reutilizarse
  `creado_en`   datetime     DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `password_reset_tokens_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;