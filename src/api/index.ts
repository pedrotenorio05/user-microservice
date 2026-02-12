import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../app.module';

// Variável para "cachear" o servidor. 
// Isso evita iniciar o NestJS do zero a cada requisição (melhora performance).
let server: any;

export default async function handler(req: any, res: any) {
  // Se o servidor já foi iniciado, reutiliza ele
  if (!server) {
    const app = await NestFactory.create(AppModule);

    // --- AQUI ESTÃO SUAS CONFIGURAÇÕES ---
    
    // 1. Validações globais (DTOs) idênticas ao seu main.ts
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }));

    // 2. Libera o CORS
    app.enableCors(); 
    
    // -------------------------------------

    // Inicializa o app, mas NÃO usa o .listen()
    await app.init();

    // Pega a instância do Express por baixo dos panos para a Vercel usar
    const expressApp = app.getHttpAdapter().getInstance();
    server = expressApp;
  }

  // Passa a requisição e a resposta para o servidor do NestJS
  return server(req, res);
}