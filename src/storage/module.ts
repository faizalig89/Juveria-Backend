import { Module } from '@nestjs/common';
import { StorageService } from './service.js';

@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}