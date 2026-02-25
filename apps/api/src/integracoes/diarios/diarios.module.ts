import { Module } from '@nestjs/common';
import { DiariosController } from './diarios.controller';
import { DiariosService } from './diarios.service';
import { DiariosCronService } from './diarios.cron';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
    controllers: [DiariosController],
    providers: [DiariosService, DiariosCronService, PrismaService],
    exports: [DiariosService],
})
export class DiariosModule { }
