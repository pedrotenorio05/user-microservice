import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common'; // <--- Importante

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 1. Ativa as validações globais (DTOs)
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true, // Remove dados que não estão no DTO (segurança)
    forbidNonWhitelisted: true, // Dá erro se mandarem dados extras
    transform: true, // Converte tipos automaticamente
  }));

  // 2. Libera o CORS (Para o Frontend conseguir chamar sua API)
  app.enableCors(); 

  await app.listen(3000);
}
bootstrap();