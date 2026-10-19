import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import NavigatedViewer from 'bpmn-js/lib/NavigatedViewer';

/** The part of diagram-js' Canvas used here (diagram-js is not a direct dependency). */
interface Canvas {
  zoom(level: 'fit-viewport', center: 'auto'): number;
}

/**
 * Read-only BPMN diagram (bpmn-js NavigatedViewer: pan and zoom, no editing).
 * Re-imports whenever `xml` changes. The bpmn.io watermark stays visible (license).
 */
@Component({
  selector: 'bs-bpmn-viewer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block h-full w-full' },
  template: `
    <div #canvas class="absolute inset-0"></div>
    <div class="absolute end-3 top-3 flex gap-1">
      <button
        type="button"
        title="Fit diagram to view"
        class="rounded border border-slate-300 bg-white/90 px-2 py-1 text-xs text-slate-700 shadow-sm hover:bg-white"
        (click)="fit()"
      >
        Fit
      </button>
    </div>
    @if (error(); as message) {
      <div
        class="absolute inset-x-3 bottom-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
      >
        Could not render this diagram: {{ message }}
      </div>
    }
  `,
})
export class BpmnViewer implements AfterViewInit, OnDestroy {
  readonly xml = input.required<string>();
  /** Emitted after each successful import, with non-blocking warnings. */
  readonly imported = output<string[]>();
  readonly importFailed = output<string>();

  protected readonly error = signal<string | null>(null);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLElement>>('canvas');
  private readonly zone = inject(NgZone);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly viewer = signal<NavigatedViewer | null>(null);

  constructor() {
    effect(() => {
      const viewer = this.viewer();
      const xml = this.xml();
      if (viewer) void this.importXml(viewer, xml);
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    const viewer = this.zone.runOutsideAngular(
      () => new NavigatedViewer({ container: this.canvasRef().nativeElement }),
    );
    this.viewer.set(viewer);
  }

  ngOnDestroy(): void {
    this.viewer()?.destroy();
    this.viewer.set(null);
  }

  fit(): void {
    this.viewer()?.get<Canvas>('canvas').zoom('fit-viewport', 'auto');
  }

  private async importXml(viewer: NavigatedViewer, xml: string): Promise<void> {
    try {
      const { warnings } = await this.zone.runOutsideAngular(() => viewer.importXML(xml));
      this.error.set(null);
      this.fit();
      this.imported.emit(warnings.map((w) => String((w as { message?: string }).message ?? w)));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      this.error.set(message);
      this.importFailed.emit(message);
    }
  }
}
