import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@/prisma/prisma.service';

export interface SystemConfig {
  id: string;
  rootOfficeName: string;
  rootOfficeSiglas: string;
  defaultRole: string;
  isInitialized: boolean;
}

@Injectable()
export class SystemConfigService implements OnModuleInit {
  private readonly logger = new Logger(SystemConfigService.name);
  private config: SystemConfig | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeSystem();
  }

  /**
   * Inicializa el sistema verificando si ya está configurado
   * NO crea datos automáticamente - solo verifica estado
   * @param configData Datos de configuración (solo para inicialización manual)
   */
  async initializeSystem(configData?: {
    rootOfficeName: string;
    rootOfficeSiglas: string;
    defaultRole: string;
  }): Promise<void> {
    try {
      // Verificar si ya está inicializado
      const existingConfig = await this.prisma.systemConfig.findUnique({
        where: { id: 'main' },
      });

      if (existingConfig) {
        this.config = existingConfig;
        
        if (existingConfig.isInitialized) {
          this.logger.log('Sistema ya está inicializado y configurado');
          this.logger.log(`Oficina raíz: ${existingConfig.rootOfficeName} (${existingConfig.rootOfficeSiglas})`);
          this.logger.log(`Rol por defecto: ${existingConfig.defaultRole}`);
        } else {
          this.logger.warn('Sistema requiere configuración inicial pendiente');
          this.logger.warn('Completando configuración con datos proporcionados...');
        }
        return;
      }

      // Si se proporcionaron datos, crear configuración
      if (!configData) {
        // NO crear configuración automáticamente
        this.logger.warn('Sistema requiere instalación inicial');
        this.logger.warn('Primer arranque detectado - esperando configuración del usuario');
        this.logger.warn('Usar endpoint POST /api/system-config/initialize con datos');
        return;
      }

      // Crear oficina raíz si no existe
      let rootOffice = await this.prisma.oficina.findUnique({
        where: { siglas: configData.rootOfficeSiglas },
      });

      if (!rootOffice) {
        rootOffice = await this.prisma.oficina.create({
          data: {
            nombre: configData.rootOfficeName,
            siglas: configData.rootOfficeSiglas,
            tipo: 'ORGANO_ALTA_DIRECCION' as any,
            isActive: true,
            esInquilino: false,
          },
        });
        this.logger.log(`Oficina raíz creada: ${rootOffice.nombre} (${rootOffice.siglas})`);
      }

      // Crear configuración del sistema
      this.config = await this.prisma.systemConfig.create({
        data: {
          id: 'main',
          rootOfficeName: configData.rootOfficeName,
          rootOfficeSiglas: configData.rootOfficeSiglas,
          defaultRole: configData.defaultRole as any,
          isInitialized: true,
        },
      });

      this.logger.log('Sistema inicializado correctamente');
      this.logger.log(`Oficina raíz: ${configData.rootOfficeName} (${configData.rootOfficeSiglas})`);
      this.logger.log(`Rol por defecto: ${configData.defaultRole}`);
      
    } catch (error) {
      this.logger.error('Error al inicializar el sistema:', error);
      throw error;
    }
  }

  /**
   * Obtiene la configuración actual del sistema
   * @throws Error si el sistema no está inicializado
   */
  async getConfig(): Promise<SystemConfig> {
    if (!this.config) {
      const config = await this.prisma.systemConfig.findUnique({
        where: { id: 'main' },
      });
      
      if (!config) {
        throw new Error('Sistema no inicializado. Usar POST /api/system-config/initialize para configurar.');
      }
      
      this.config = config;
    }

    return this.config;
  }

  /**
   * Actualiza la configuración del sistema
   */
  async updateConfig(updates: Partial<SystemConfig>): Promise<SystemConfig> {
    const currentConfig = await this.getConfig();

    // Validaciones de seguridad
    if (updates.defaultRole && updates.defaultRole === 'SUPERUSER') {
      throw new Error('No se puede establecer SUPERUSER como rol por defecto');
    }

    // Actualizar en base de datos
    this.config = await this.prisma.systemConfig.update({
      where: { id: 'main' },
      data: {
        rootOfficeName: updates.rootOfficeName,
        rootOfficeSiglas: updates.rootOfficeSiglas,
        ...(updates.defaultRole && { defaultRole: updates.defaultRole as any }),
        ...(updates.isInitialized !== undefined && { isInitialized: updates.isInitialized }),
      },
    });

    this.logger.log('Configuración del sistema actualizada');

    return this.config;
  }

  /**
   * Obtiene las siglas de la oficina raíz
   */
  async getRootOfficeSiglas(): Promise<string> {
    const config = await this.getConfig();
    return config.rootOfficeSiglas;
  }

  /**
   * Obtiene el nombre de la oficina raíz
   */
  async getRootOfficeName(): Promise<string> {
    const config = await this.getConfig();
    return config.rootOfficeName;
  }

  /**
   * Verifica si el sistema está inicializado
   */
  async isInitialized(): Promise<boolean> {
    const config = await this.getConfig();
    return config.isInitialized;
  }

  /**
   * Resetear configuración (solo para desarrollo/testing)
   */
  async resetConfig(): Promise<void> {
    await this.prisma.systemConfig.delete({
      where: { id: 'main' },
    });
    
    this.config = null;
    this.logger.warn('Configuración del sistema reseteada');
  }
}
