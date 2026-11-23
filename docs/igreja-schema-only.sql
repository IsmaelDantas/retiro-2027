-- ============================================================================
-- Retiro 2027 — Schema de Referência do Módulo PHP da Igreja (SEM DADOS REAIS)
-- Contém exclusivamente instruções DDL (CREATE TABLE / índices) para estudo
-- e mapeamento de importação. Nenhum registro pessoal (INSERT) consta aqui.
-- ============================================================================

CREATE TABLE `retiro_inscricoes` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `ano` smallint(5) UNSIGNED NOT NULL,
  `nome` varchar(150) NOT NULL,
  `nascimento` date NOT NULL,
  `whatsapp` varchar(20) NOT NULL,
  `igreja` varchar(150) DEFAULT NULL,
  `responsavel_nome` varchar(150) DEFAULT NULL,
  `responsavel_whatsapp` varchar(20) DEFAULT NULL,
  `autorizacao_responsavel` tinyint(1) NOT NULL DEFAULT 0,
  `aceite_privacidade` tinyint(1) NOT NULL DEFAULT 0,
  `protocolo` varchar(24) NOT NULL,
  `criado_em` timestamp NOT NULL DEFAULT current_timestamp(),
  `situacao` enum('ativa','cancelada') NOT NULL DEFAULT 'ativa',
  `cpf` varchar(11) DEFAULT NULL,
  `localidade` varchar(150) DEFAULT NULL,
  `email` varchar(190) DEFAULT NULL,
  `ficara_interno` enum('sim','nao') DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_retiro_protocolo` (`protocolo`),
  KEY `idx_retiro_ano` (`ano`),
  KEY `idx_retiro_nome` (`nome`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `retiro_termos_aceites` (
  `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
  `inscricao_id` int(11) NOT NULL,
  `versao` varchar(20) NOT NULL,
  `termo_texto` mediumtext NOT NULL,
  `termo_sha256` char(64) NOT NULL,
  `tipo` enum('maior','menor') NOT NULL,
  `aceite_termo` tinyint(1) NOT NULL,
  `autoriza_imagem` enum('sim','nao') NOT NULL,
  `autoriza_pernoite` enum('sim','nao') DEFAULT NULL,
  `responsavel_cpf` varchar(11) DEFAULT NULL,
  `responsavel_vinculo` varchar(30) DEFAULT NULL,
  `responsavel_nome_declarado` varchar(150) DEFAULT NULL,
  `ip_origem` varchar(45) DEFAULT NULL,
  `agente_usuario` varchar(500) DEFAULT NULL,
  `aceito_em` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_inscricao` (`inscricao_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
