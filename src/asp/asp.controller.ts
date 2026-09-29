import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { AspService } from './asp.service.js';

@Controller('asp')
@UseGuards(JwtAuthGuard)
export class AspController {
  constructor(
    private readonly aspService: AspService,
  ) {}

  @Get('invoice/:id/submissions')
  list(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.aspService.listForInvoice(id, req.user?.tenantId);
  }

  @Post('submission/:id/reconcile')
  reconcile(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    return this.aspService.reconcile(
      id,
      req.user?.tenantId,
    );
  }
  @Post('submission/:id/retry')
  retry(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const { tenantId, userId, sub } = req.user;

    return this.aspService.retry(
      id,
      tenantId,
      userId ?? sub,
    );
  }
  @Post('invoice/:id/submit')
  submit(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const { tenantId, userId, sub } = req.user;

    return this.aspService.submit(
      id,
      tenantId,
      userId ?? sub,
    );
  }
}


