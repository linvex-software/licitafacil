import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHello(): string {
    return "Licitafacil API - Sistema de Gestão de Licitações";
  }
}

