import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { AuthModule } from './auth/auth.module';
import { ProjectModule } from './project/project.module';
import { BoardModule } from './board/board.module';
import { DocumentModule } from './document/document.module';
import { MeetingModule } from './meeting/meeting.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'mysql',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 50003),
        username: config.get<string>('DB_USERNAME', 'gritpus'),
        password: config.get<string>('DB_PASSWORD', 'gritpuspassword'),
        database: config.get<string>('DB_DATABASE', 'gritpus'),
        autoLoadEntities: true,
        synchronize: false,
        migrationsRun: true,
        migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
      }),
    }),
    ChatModule,
    AuthModule,
    ProjectModule,
    BoardModule,
    DocumentModule,
    MeetingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
