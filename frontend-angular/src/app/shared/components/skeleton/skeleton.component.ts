import { Component, input } from '@angular/core';
import { cn } from '../../utils/class-names';

@Component({
  selector: 'app-skeleton',
  template: `<div [class]="cn('animate-pulse rounded-md bg-muted/60', className())"></div>`,
})
export class SkeletonComponent {
  readonly className = input<string>('', { alias: 'class' });
  protected readonly cn = cn;
}
