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
  untracked,
  viewChild,
} from '@angular/core';
import Modeler from 'bpmn-js/lib/Modeler';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
  ZeebePropertiesProviderModule,
} from 'bpmn-js-properties-panel';
import ZeebeBehaviorsModule from 'camunda-bpmn-js-behaviors/lib/camunda-cloud';
import zeebeModdle from 'zeebe-bpmn-moddle/resources/zeebe.json';
import { textRendererConfig } from './diagram-text';

/** The part of diagram-js' Canvas used here. */
interface Canvas {
  zoom(level: 'fit-viewport', center: 'auto'): number;
}

interface CommandStackChanged {
  trigger: 'execute' | 'undo' | 'redo' | 'clear' | null;
}

/**
 * Editable BPMN diagram for Camunda 8: bpmn-js Modeler, the Zeebe properties panel and the
 * Camunda Cloud modeling behaviors. Canvas and panel sit side by side (stacked on small screens).
 *
 * Loads `xml` whenever the input changes and reports the outcome through `imported` /
 * `importFailed`. `importXml()` loads a document imperatively (for example a file the user
 * picked, even if it equals the current input) and returns the error instead; when a file does
 * not parse, the current diagram stays on the canvas. Every user edit, undo and redo emits
 * `changed`. The bpmn.io watermark stays visible (license).
 */
@Component({
  selector: 'bs-bpmn-modeler',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-full w-full flex-col md:flex-row' },
  template: `
    <div class="relative min-h-72 flex-1">
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
          role="alert"
          class="absolute inset-x-3 bottom-3 rounded border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
        >
          Could not open this diagram: {{ message }}
        </div>
      }
    </div>
    <aside
      #panel
      aria-label="Properties"
      class="h-72 shrink-0 overflow-y-auto border-t border-slate-200 md:h-auto md:w-80 md:border-s md:border-t-0"
    ></aside>
  `,
})
export class BpmnModeler implements AfterViewInit, OnDestroy {
  readonly xml = input.required<string>();
  /** Emitted after each successful import, with non-blocking warnings. */
  readonly imported = output<string[]>();
  readonly importFailed = output<string>();
  /** The diagram was edited (including undo / redo). */
  readonly changed = output<void>();

  protected readonly error = signal<string | null>(null);
  private readonly canvasRef = viewChild.required<ElementRef<HTMLElement>>('canvas');
  private readonly panelRef = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly zone = inject(NgZone);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly modeler = signal<Modeler | null>(null);

  constructor() {
    effect(() => {
      const modeler = this.modeler();
      const xml = this.xml();
      if (modeler) untracked(() => void this.load(modeler, xml));
    });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    const modeler = this.zone.runOutsideAngular(() => {
      const instance = new Modeler({
        container: this.canvasRef().nativeElement,
        propertiesPanel: { parent: this.panelRef().nativeElement },
        additionalModules: [
          BpmnPropertiesPanelModule,
          BpmnPropertiesProviderModule,
          ZeebePropertiesProviderModule,
          ZeebeBehaviorsModule,
        ],
        moddleExtensions: { zeebe: zeebeModdle },
        textRenderer: textRendererConfig(this.canvasRef().nativeElement),
      });
      instance.on<CommandStackChanged>('commandStack.changed', ({ trigger }) => {
        if (trigger !== 'clear') this.changed.emit();
      });
      return instance;
    });
    this.modeler.set(modeler);
  }

  ngOnDestroy(): void {
    this.modeler()?.destroy();
    this.modeler.set(null);
  }

  /**
   * Loads a document, replacing the current one and its undo history.
   * Resolves to null on success, otherwise to the error message.
   */
  async importXml(xml: string): Promise<string | null> {
    const modeler = this.modeler();
    if (!modeler) return 'The modeler is not ready';
    try {
      await this.zone.runOutsideAngular(() => modeler.importXML(xml));
      this.error.set(null);
      this.fit();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }

  /** The current diagram, formatted. */
  async saveXml(): Promise<string> {
    const modeler = this.modeler();
    if (!modeler) throw new Error('The modeler is not ready');
    const { xml } = await this.zone.runOutsideAngular(() => modeler.saveXML({ format: true }));
    if (!xml) throw new Error('The modeler produced no XML');
    return xml;
  }

  fit(): void {
    this.modeler()?.get<Canvas>('canvas').zoom('fit-viewport', 'auto');
  }

  private async load(modeler: Modeler, xml: string): Promise<void> {
    try {
      const { warnings } = await this.zone.runOutsideAngular(() => modeler.importXML(xml));
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
