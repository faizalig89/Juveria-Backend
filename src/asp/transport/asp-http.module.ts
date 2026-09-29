import {
  Module,
} from '@nestjs/common';
import {
  AspHttpService,
} from './asp-http.service.js';

@Module({
  providers: [
    AspHttpService,
  ],
  exports: [
    AspHttpService,
  ],
})
export class AspHttpModule {}
