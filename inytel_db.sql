-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: inytel_db
-- ------------------------------------------------------
-- Server version	8.0.45

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

--
-- Table structure for table `empleados`
--

DROP TABLE IF EXISTS `empleados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `empleados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) DEFAULT NULL,
  `cargo` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `departamento` varchar(100) DEFAULT NULL,
  `fecha_alta` date DEFAULT NULL,
  `dni` varchar(20) DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `horas_semanales` int DEFAULT '40',
  `dias_laborables` varchar(20) DEFAULT '1,2,3,4,5',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `empleados`
--

LOCK TABLES `empleados` WRITE;
/*!40000 ALTER TABLE `empleados` DISABLE KEYS */;
INSERT INTO `empleados` VALUES (1,'Fran García','Director Técnico','fgarcia@inytel.es','621144778','Analisis Técnico','2026-03-10','14744558E',0,40,'1,2,3,4,5'),(2,'Ana Martínez','Diseñadora UI',NULL,NULL,NULL,NULL,NULL,1,40,'1,2,3,4,5'),(3,'Marcos Soler','Fullstack Dev',NULL,NULL,NULL,NULL,NULL,1,40,'1,2,3,4,5'),(4,'Carlos Lopez','Técnico de Redes','carlos.lopez@inytel.es','612 345 678','Infraestructura','2022-03-15','12345678A',1,40,'1,2,3,4,5'),(5,'María García','Jefa de Proyectos','maria.garcia@inytel.es','623 456 789','GestiÃ³n','2020-01-10','23456789B',1,40,'1,2,3,4,5'),(6,'Alejandro Ruiz','Desarrollador','alejandro.ruiz@inytel.es','634 567 890','Software','2023-06-01','34567890C',1,40,'1,2,3,4,5'),(7,'Laura Martínez','AdministraciÃ³n','laura.martinez@inytel.es','645 678 901','RRHH','2019-09-20','45678901D',1,40,'1,2,3,4,5'),(10,'Jose Antonio Bas Frances','Asesor Técnico','jfrances@inytel.es','618478210','Entornos de Desarrollo','2026-03-10','17478741B',1,40,'1,2,3,4,5'),(11,'Angel Luis Litago Falces','Desarrollador de Software','alitago@inytel.es','922727272','Legal','2026-03-10','78655432Q',1,40,'1,2,3,4,5'),(12,'Maria Bas Silvestre','Tecnico','mbas@inytel.es','615524423','Aguas','2026-03-10','98877656B',1,40,'1,2,3,4,5'),(14,'Ayoze Pestano ','Técnico de Desarrollo','apestano@inytel.es','672727272','Redes','2026-03-13','12345678A',1,40,'1,2,3,4,5');
/*!40000 ALTER TABLE `empleados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fichajes`
--

DROP TABLE IF EXISTS `fichajes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fichajes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `empleado_id` int NOT NULL,
  `fecha_entrada` date NOT NULL,
  `hora_entrada` time NOT NULL,
  `fecha_salida` date DEFAULT NULL,
  `hora_salida` time DEFAULT NULL,
  `hora_salida_real` time DEFAULT NULL,
  `motivo_incidencia` enum('olvido','error_aplicacion','otros') DEFAULT NULL,
  `observaciones` varchar(255) DEFAULT NULL,
  `fecha_incidencia` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `empleado_id` (`empleado_id`),
  KEY `idx_fecha_entrada` (`fecha_entrada`),
  CONSTRAINT `fichajes_ibfk_1` FOREIGN KEY (`empleado_id`) REFERENCES `empleados` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fichajes`
--

LOCK TABLES `fichajes` WRITE;
/*!40000 ALTER TABLE `fichajes` DISABLE KEYS */;
INSERT INTO `fichajes` VALUES (1,11,'2026-03-11','08:26:18','2026-03-11','18:30:00','18:30:00','olvido',NULL,'2026-03-12 10:01:28'),(2,12,'2026-03-11','09:35:24','2026-03-11','18:30:00','18:30:00','olvido',NULL,'2026-03-12 11:03:10'),(3,10,'2026-03-11','09:06:31','2026-03-11','18:04:59',NULL,NULL,NULL,NULL),(4,12,'2026-03-12','11:05:35','2026-03-12','18:19:32',NULL,NULL,NULL,NULL),(5,11,'2026-03-12','11:10:18','2026-03-12','18:16:59',NULL,NULL,NULL,NULL),(6,10,'2026-03-12','11:10:45','2026-03-12','18:18:41',NULL,NULL,NULL,NULL),(7,4,'2026-03-12','11:18:22','2026-03-12','18:19:08',NULL,NULL,NULL,NULL),(8,7,'2026-03-12','12:46:40','2026-03-12','18:18:05',NULL,NULL,NULL,NULL),(9,6,'2026-03-12','12:47:26','2026-03-12','18:17:31',NULL,NULL,NULL,NULL),(10,14,'2026-03-13','10:45:48','2026-03-13','10:46:46',NULL,NULL,NULL,NULL),(11,11,'2026-03-17','09:35:40','2026-03-17','14:33:15',NULL,NULL,NULL,NULL),(12,11,'2026-03-17','16:05:38','2026-03-17','18:16:06',NULL,NULL,NULL,NULL),(13,11,'2026-03-18','09:07:08','2026-03-18','14:06:04',NULL,NULL,NULL,NULL),(14,11,'2026-03-18','17:15:47','2026-03-18','19:39:24',NULL,NULL,NULL,NULL),(15,11,'2026-03-19','08:34:20',NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `fichajes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol` enum('admin','empleado') NOT NULL DEFAULT 'empleado',
  `empleado_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `empleado_id` (`empleado_id`),
  CONSTRAINT `usuarios_ibfk_1` FOREIGN KEY (`empleado_id`) REFERENCES `empleados` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'Administrador','admin@inytel.es','$2b$10$A2J5Zfv2phpLBWzgyaEGlOt5uV2cJ8lsHFSEWKjJgftCdl9deyrNy','admin',NULL),(2,'Fran García','fgarcia@inytel.es','$2b$10$2gexOASoVe4fF5Av2i/AAONDmBSM352WB4qoETto7tRrmqquRb7my','empleado',1),(3,'Angel Luis Litago Falces','alitago@inytel.es','$2b$10$sH6hiMm8Ez3GxWUK5A3/S.hAOnZaI3H3pnLxBo8dZI5GYoWjjyuoy','empleado',11),(4,'Maria Bas Silvestre','mbas@inytel.es','$2b$10$Peb026758.JhA07TQ4Ia5OCPusRwwBaLE/9qFiotH7WxPAMcO7lum','empleado',12),(6,'Carlos Lopez','carlos.lopez@inytel.es','$2b$10$BfBTJ0xWp32hfr.r/N0c0eUlKlQVC5eC1wpAun48FIK2Ev5HqHgU2','empleado',4),(7,'María García','maria.garcia@inytel.es','$2b$10$Z7l.xdaKT7FIIaYsUq9Wo.EAbCpb4TmRqbMn.4bkO4UQ1jp4K/GPC','empleado',5),(8,'Alejandro Ruiz','alejandro.ruiz@inytel.es','$2b$10$ScCO.ObHcHTDLIDjCqEDL.zsFagciCJwKdT0p7zJRtjK6uArZij9e','empleado',6),(9,'Laura Martínez','laura.martinez@inytel.es','$2b$10$T3vliFjSuWqz5D3YLqUU2uYbvYbjS6PkPqeO63SCMD9jei6FcFa2u','empleado',7),(10,'Jose Antonio Bas Frances','jfrances@inytel.es','$2b$10$q0fDqO2uG5xUisXSse0ed.VNUINj/4cI40lKGfrmV3k1wefD18Jxa','empleado',10),(11,'Ayoze Pestano ','apestano@inytel.es','$2b$10$d7li4dP5cpgDTr7PHt1PNuCIsgwfVB7UslgH3C9aJlOY4n.WfhjJ.','empleado',14);
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-19 10:28:04
