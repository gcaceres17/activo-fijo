-- ============================================================
-- Seed 001: Datos de desarrollo — CLT S.A.
-- ============================================================

-- Tenant: CLT S.A.
INSERT INTO public.tenants (id, nombre, ruc, activo)
VALUES ('11111111-1111-1111-1111-111111111111', 'CLT S.A.', '80000001-1', TRUE)
ON CONFLICT DO NOTHING;

-- Usuario admin
-- Password: Admin1234 (bcrypt hash)
INSERT INTO public.usuarios (id, tenant_id, email, password_hash, nombre_completo, rol)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'giovanni.caceres@clt.com.py',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LpOd7R7Ib3bQyA5Ue',  -- Admin1234
    'Giovanni Cáceres',
    'admin'
) ON CONFLICT DO NOTHING;

-- Inicializar secuencia del tenant
INSERT INTO public.activos_sequence (tenant_id, last_value)
VALUES ('11111111-1111-1111-1111-111111111111', 0)
ON CONFLICT DO NOTHING;

-- Categorías
INSERT INTO public.categorias (id, tenant_id, nombre, icono, color_hex, vida_util_default_años) VALUES
('cat-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'Equipos de Cómputo',      'monitor',  '#6874B5', 5),
('cat-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'Mobiliario y Enseres',    'armchair', '#65A0D3', 10),
('cat-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'Vehículos',               'car',      '#6CBEDA', 10),
('cat-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', 'Maquinaria Industrial',   'settings', '#8A93A2', 10),
('cat-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', 'Equipos de Comunicación', 'phone',    '#525E9E', 7),
('cat-0001-0001-0001-000000000006', '11111111-1111-1111-1111-111111111111', 'Edificios y Terrenos',    'building', '#2A3645', 50)
ON CONFLICT DO NOTHING;

-- Centros de Costo
INSERT INTO public.centros_costo (id, tenant_id, codigo, nombre) VALUES
('cc00-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'TEC-001', 'Tecnología e Innovación'),
('cc00-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'FIN-002', 'Contabilidad y Finanzas'),
('cc00-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'RRHH-003','Recursos Humanos'),
('cc00-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', 'OPS-004', 'Operaciones Generales'),
('cc00-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', 'GER-005', 'Gerencia General'),
('cc00-0001-0001-0001-000000000006', '11111111-1111-1111-1111-111111111111', 'LOG-006', 'Logística y Distribución'),
('cc00-0001-0001-0001-000000000007', '11111111-1111-1111-1111-111111111111', 'COM-007', 'Comercial y Ventas'),
('cc00-0001-0001-0001-000000000008', '11111111-1111-1111-1111-111111111111', 'LEG-008', 'Legal y Cumplimiento'),
('cc00-0001-0001-0001-000000000009', '11111111-1111-1111-1111-111111111111', 'AUD-009', 'Auditoría Interna'),
('cc00-0001-0001-0001-000000000010', '11111111-1111-1111-1111-111111111111', 'ADM-010', 'Administración')
ON CONFLICT DO NOTHING;

-- Activos de ejemplo (12 activos del diseño)
INSERT INTO public.activos (id, tenant_id, codigo, nombre, categoria_id, marca, modelo, numero_serie, fecha_compra, valor_adquisicion, vida_util_años, valor_residual, estado, area, centro_costo_id, responsable, ubicacion) VALUES
('act-0001-0001-0001-000000000001','11111111-1111-1111-1111-111111111111','ACT-0001','Laptop Dell Latitude 5540','cat-0001-0001-0001-000000000001','Dell','Latitude 5540','DL5540-PY-001','2023-03-15',4850000,5,0,'activo','Tecnología','cc00-0001-0001-0001-000000000001','Carlos Méndez','Sede Central - Asunción'),
('act-0001-0001-0001-000000000002','11111111-1111-1111-1111-111111111111','ACT-0002','Monitor LG UltraWide 34"','cat-0001-0001-0001-000000000001','LG','34WN780-B','LG34-PY-002','2023-03-15',1950000,5,0,'activo','Tecnología','cc00-0001-0001-0001-000000000001','Carlos Méndez','Sede Central - Asunción'),
('act-0001-0001-0001-000000000003','11111111-1111-1111-1111-111111111111','ACT-0003','Toyota Hilux 4x4','cat-0001-0001-0001-000000000003','Toyota','Hilux SRV','9BR149HG0N0001234','2022-07-01',145000000,10,0,'activo','Logística','cc00-0001-0001-0001-000000000006','Roberto Silva','Sede Central - Asunción'),
('act-0001-0001-0001-000000000004','11111111-1111-1111-1111-111111111111','ACT-0004','Servidor HP ProLiant DL380','cat-0001-0001-0001-000000000001','HP','ProLiant DL380 Gen10','HP-DL380-SRV-001','2021-11-20',28500000,7,0,'en_mantenimiento','Tecnología','cc00-0001-0001-0001-000000000001','Ana Torres','Sala de Servidores'),
('act-0001-0001-0001-000000000005','11111111-1111-1111-1111-111111111111','ACT-0005','Escritorio Ejecutivo','cat-0001-0001-0001-000000000002','Steelcase','Series 5 Adjustable','SC-DESK-0042','2022-01-10',3200000,10,0,'activo','Gerencia General','cc00-0001-0001-0001-000000000005','Lucía Fernández','Sede Central - Asunción'),
('act-0001-0001-0001-000000000006','11111111-1111-1111-1111-111111111111','ACT-0006','Impresora HP LaserJet Pro','cat-0001-0001-0001-000000000001','HP','LaserJet Pro M404n','HP-LJ-2022-007','2022-05-20',1850000,5,0,'dado_de_baja','Administración','cc00-0001-0001-0001-000000000010','Pedro Gómez','Bodega Central'),
('act-0001-0001-0001-000000000007','11111111-1111-1111-1111-111111111111','ACT-0007','Switch Cisco Catalyst 2960','cat-0001-0001-0001-000000000005','Cisco','Catalyst 2960-X','CSC-2960-PY-003','2021-08-15',8750000,7,0,'activo','Tecnología','cc00-0001-0001-0001-000000000001','Mario López','Sala de Servidores'),
('act-0001-0001-0001-000000000008','11111111-1111-1111-1111-111111111111','ACT-0008','Silla Ergonómica Herman Miller','cat-0001-0001-0001-000000000002','Herman Miller','Aeron B','HM-AERON-0089','2023-06-01',4500000,10,0,'activo','Gerencia General','cc00-0001-0001-0001-000000000005','Lucía Fernández','Sede Central - Asunción'),
('act-0001-0001-0001-000000000009','11111111-1111-1111-1111-111111111111','ACT-0009','UPS APC Smart-UPS 3000VA','cat-0001-0001-0001-000000000001','APC','SMT3000I','APC-UPS-PY-012','2022-09-10',6200000,5,0,'activo','Tecnología','cc00-0001-0001-0001-000000000001','Ana Torres','Sala de Servidores'),
('act-0001-0001-0001-000000000010','11111111-1111-1111-1111-111111111111','ACT-0010','Aire Acondicionado Inverter','cat-0001-0001-0001-000000000004','Carrier','42XQB048D510HC','CARRIER-AC-2021-005','2021-03-20',12500000,10,0,'activo','Operaciones','cc00-0001-0001-0001-000000000004','Juan Castro','Sede Central - Asunción'),
('act-0001-0001-0001-000000000011','11111111-1111-1111-1111-111111111111','ACT-0011','Laptop Lenovo ThinkPad X1','cat-0001-0001-0001-000000000001','Lenovo','ThinkPad X1 Carbon Gen 11','LNV-X1-2023-015','2023-09-01',6800000,5,0,'activo','Contabilidad','cc00-0001-0001-0001-000000000002','María Giménez','Sede Central - Asunción'),
('act-0001-0001-0001-000000000012','11111111-1111-1111-1111-111111111111','ACT-0012','Proyector Epson PowerLite','cat-0001-0001-0001-000000000005','Epson','PowerLite 2250U','EPS-PROJ-PY-004','2022-02-14',3800000,7,0,'reservado','Gerencia General','cc00-0001-0001-0001-000000000005','Lucía Fernández','Sede Central - Asunción')
ON CONFLICT DO NOTHING;

-- Actualizar secuencia
UPDATE public.activos_sequence SET last_value = 12
WHERE tenant_id = '11111111-1111-1111-1111-111111111111';

-- Asignaciones
INSERT INTO public.asignaciones (id, tenant_id, activo_id, empleado_nombre, empleado_cedula, area, centro_costo_id, fecha_asignacion, estado, observaciones) VALUES
('asg-0001-0001-0001-000000000001','11111111-1111-1111-1111-111111111111','act-0001-0001-0001-000000000001','Carlos Méndez','3.456.789','Tecnología','cc00-0001-0001-0001-000000000001','2023-03-20','vigente','Uso para desarrollo de software'),
('asg-0001-0001-0001-000000000002','11111111-1111-1111-1111-111111111111','act-0001-0001-0001-000000000002','Carlos Méndez','3.456.789','Tecnología','cc00-0001-0001-0001-000000000001','2023-03-20','vigente','Monitor secundario'),
('asg-0001-0001-0001-000000000003','11111111-1111-1111-1111-111111111111','act-0001-0001-0001-000000000003','Roberto Silva','5.123.456','Logística','cc00-0001-0001-0001-000000000006','2022-07-05','vigente','Vehículo de uso operativo'),
('asg-0001-0001-0001-000000000004','11111111-1111-1111-1111-111111111111','act-0001-0001-0001-000000000005','Lucía Fernández','4.567.890','Gerencia General','cc00-0001-0001-0001-000000000005','2022-01-15','vigente','Despacho Gerencia'),
('asg-0001-0001-0001-000000000005','11111111-1111-1111-1111-111111111111','act-0001-0001-0001-000000000011','María Giménez','6.789.012','Contabilidad','cc00-0001-0001-0001-000000000002','2023-09-05','vigente','Uso administrativo-contable')
ON CONFLICT DO NOTHING;

-- Mantenimientos
INSERT INTO public.mantenimientos (id, tenant_id, activo_id, tipo, descripcion, tecnico, proveedor, fecha_inicio, fecha_estimada_fin, costo, estado) VALUES
('mnt-0001-0001-0001-000000000001','11111111-1111-1111-1111-111111111111','act-0001-0001-0001-000000000004','correctivo','Falla en fuente de alimentación redundante. Reemplazo de PSU #2','Mario López','HP Paraguay','2024-04-20','2024-05-05',850000,'en_proceso'),
('mnt-0001-0001-0001-000000000002','11111111-1111-1111-1111-111111111111','act-0001-0001-0001-000000000010','preventivo','Limpieza de filtros y revisión de gas refrigerante','Externo - Carrier','Carrier Paraguay','2024-03-10','2024-03-10',320000,'completado'),
('mnt-0001-0001-0001-000000000003','11111111-1111-1111-1111-111111111111','act-0001-0001-0001-000000000003','preventivo','Cambio de aceite y filtros. 80,000 km','Externo - Toyota','Toyota Paraguay','2024-02-28','2024-02-28',550000,'completado'),
('mnt-0001-0001-0001-000000000004','11111111-1111-1111-1111-111111111111','act-0001-0001-0001-000000000007','preventivo','Actualización de firmware y limpieza de puertos','Carlos Méndez','Interno','2024-01-15','2024-01-15',0,'completado'),
('mnt-0001-0001-0001-000000000005','11111111-1111-1111-1111-111111111111','act-0001-0001-0001-000000000009','predictivo','Revisión de baterías y prueba de autonomía','Ana Torres','APC Paraguay','2024-05-01','2024-05-10',180000,'programado')
ON CONFLICT DO NOTHING;

-- Dispositivos
INSERT INTO public.dispositivos (id, tenant_id, nombre, tipo, protocolo, driver, estado, ultima_conexion) VALUES
('dev-0001-0001-0001-000000000001','11111111-1111-1111-1111-111111111111','Zebra ZD421','impresora','usb','ZebraSetup-ZD421-v3.2.1','conectado',NOW() - INTERVAL '2 minutes'),
('dev-0001-0001-0001-000000000002','11111111-1111-1111-1111-111111111111','Honeywell Xenon 1950','lector_qr','usb_hid','Nativo (HID)','conectado',NOW() - INTERVAL '5 minutes'),
('dev-0001-0001-0001-000000000003','11111111-1111-1111-1111-111111111111','Zebra ZT230','impresora','tcp_ip','ZPL-ZT230-v2.1.0','desconectado',NOW() - INTERVAL '3 days'),
('dev-0001-0001-0001-000000000004','11111111-1111-1111-1111-111111111111','Datalogic Gryphon GD4520','lector_barcode','bluetooth','Datalogic-BT-v1.4','emparejado',NOW() - INTERVAL '1 hour')
ON CONFLICT DO NOTHING;

-- Audit logs de ejemplo
INSERT INTO public.audit_logs (id, tenant_id, fecha_hora, usuario_email, accion, entidad, entidad_id, detalle) VALUES
(uuid_generate_v4(),'11111111-1111-1111-1111-111111111111',NOW()-INTERVAL '2 hours','giovanni.caceres@clt.com.py','ALTA_ACTIVO','Activo','act-0001-0001-0001-000000000012','Se registró el activo ACT-0012: Proyector Epson PowerLite'),
(uuid_generate_v4(),'11111111-1111-1111-1111-111111111111',NOW()-INTERVAL '5 hours','giovanni.caceres@clt.com.py','MODIFICACION','Activo','act-0001-0001-0001-000000000004','ACT-0004: Estado cambiado a en_mantenimiento'),
(uuid_generate_v4(),'11111111-1111-1111-1111-111111111111',NOW()-INTERVAL '1 day','giovanni.caceres@clt.com.py','ASIGNACION','Asignacion','asg-0001-0001-0001-000000000005','ACT-0011 asignado a María Giménez - Contabilidad'),
(uuid_generate_v4(),'11111111-1111-1111-1111-111111111111',NOW()-INTERVAL '2 days','giovanni.caceres@clt.com.py','ALTA_MANTENIMIENTO','Mantenimiento','mnt-0001-0001-0001-000000000001','Mantenimiento correctivo registrado para ACT-0004')
ON CONFLICT DO NOTHING;
