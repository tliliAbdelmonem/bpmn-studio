import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  BpmnModelDto,
  ProblemDetails,
  VERSION_COMMENT_MAX_LENGTH,
  exportFileName,
} from '@bpmn-studio/shared';
import { map, switchMap } from 'rxjs';
import { BpmnModeler } from '../../bpmn/bpmn-modeler';
import { ApiService, problemMessage } from '../../core/api.service';
import { saveFile } from '../../core/download';
import { ToastService } from '../../core/toast.service';
import { Button } from '../../shared/ui/button';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog';
import { Dialog } from '../../shared/ui/dialog';
import { HasUnsavedChanges } from './unsaved-changes.guard';

/** Edits the current version of a model; every save appends a new immutable version. */
@Component({
  selector: 'bs-model-editor-page',
  imports: [RouterLink, Button, Dialog, ConfirmDialog, BpmnModeler],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex h-[calc(100dvh-8.5rem)] min-h-[32rem] flex-col',
    '(window:beforeunload)': 'onBeforeUnload($event)',
  },
  template: `
    <nav class="text-sm text-slate-500">
      <a routerLink="/models" class="hover:text-slate-900">Models</a>
      <span class="mx-1">/</span>
      <span class="text-slate-900">{{ model()?.name ?? '…' }}</span>
    </nav>

    @if (loadError(); as error) {
      <div class="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        <p class="font-medium">Could not load this model.</p>
        <p class="mt-1">{{ error }}</p>
        <button type="button" bsButton="secondary" class="mt-3" (click)="load()">Retry</button>
      </div>
    } @else {
      <div class="mt-2 flex flex-wrap items-center gap-2">
        <h1 class="text-2xl font-semibold">Editor</h1>
        @if (model(); as m) {
          <span
            class="ms-1 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
            [class]="dirty() ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-800'"
            role="status"
          >
            <span
              class="size-1.5 rounded-full"
              [class]="dirty() ? 'bg-amber-500' : 'bg-emerald-500'"
            ></span>
            {{ dirty() ? 'Unsaved changes' : 'Saved as v' + m.currentVersionNumber }}
          </span>
        }
        <span class="me-auto"></span>
        <a bsButton="ghost" [routerLink]="['/models', id(), 'versions']">History</a>
        <label
          bsButton="secondary"
          class="has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50"
        >
          Import
          <input
            type="file"
            accept=".bpmn,.xml"
            class="sr-only"
            [disabled]="!ready() || busy()"
            (change)="pickFile($event)"
          />
        </label>
        <button type="button" bsButton="secondary" [disabled]="!ready()" (click)="export()">
          Export
        </button>
        <button
          type="button"
          bsButton="secondary"
          disabled
          title="Deploying to Camunda arrives in the next phase"
        >
          Deploy
        </button>
        <button
          type="button"
          bsButton
          [disabled]="!ready() || busy()"
          (click)="saveDialogOpen.set(true)"
        >
          Save as new version
        </button>
      </div>

      <div
        class="mt-4 min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white"
        aria-label="Diagram editor"
      >
        @if (xml(); as xml) {
          <bs-bpmn-modeler
            [xml]="xml"
            (changed)="dirty.set(true)"
            (imported)="onImported($event)"
            (importFailed)="ready.set(false)"
          />
        } @else {
          <p class="p-4 text-sm text-slate-500">Loading diagram…</p>
        }
      </div>
    }

    <bs-dialog
      [open]="saveDialogOpen()"
      heading="Save as new version"
      (closed)="saveDialogOpen.set(false)"
    >
      <form id="save-version-form" (submit)="save($event)">
        <p>
          The diagram is stored as v{{ (model()?.currentVersionNumber ?? 0) + 1 }}. Earlier versions
          are kept.
        </p>
        <label class="mt-4 flex flex-col gap-1">
          <span class="font-medium text-slate-700"
            >Comment <span class="font-normal text-slate-400">(optional)</span></span
          >
          <textarea
            name="comment"
            rows="3"
            [maxLength]="commentMax"
            [value]="comment()"
            (input)="comment.set($any($event.target).value)"
            class="rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none"
          ></textarea>
        </label>
      </form>
      <ng-container actions>
        <button type="button" bsButton="secondary" (click)="saveDialogOpen.set(false)">
          Cancel
        </button>
        <button type="submit" form="save-version-form" bsButton [disabled]="busy()">Save</button>
      </ng-container>
    </bs-dialog>

    <bs-confirm-dialog
      [open]="pendingImport() !== null"
      heading="Replace the diagram?"
      [message]="
        'Your unsaved changes will be replaced by ' +
        (pendingImport()?.name ?? 'the file') +
        '. Nothing is stored until you save.'
      "
      confirmLabel="Replace"
      [danger]="true"
      (confirmed)="confirmImport()"
      (cancelled)="pendingImport.set(null)"
    />
  `,
})
export class ModelEditorPage implements HasUnsavedChanges {
  /** Route parameter (`/models/:id/edit`). */
  readonly id = input.required<string>();

  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);
  private readonly modeler = viewChild(BpmnModeler);

  protected readonly model = signal<BpmnModelDto | null>(null);
  /** The XML of the current version as loaded from the API. */
  protected readonly xml = signal<string | null>(null);
  protected readonly loadError = signal<string | null>(null);
  /** A diagram is on the canvas and can be saved or exported. */
  protected readonly ready = signal(false);
  protected readonly dirty = signal(false);
  protected readonly busy = signal(false);
  protected readonly saveDialogOpen = signal(false);
  protected readonly comment = signal('');
  protected readonly pendingImport = signal<File | null>(null);
  protected readonly commentMax = VERSION_COMMENT_MAX_LENGTH;

  constructor() {
    effect(() => {
      this.id();
      untracked(() => this.load());
    });
    // Each save starts with an empty comment.
    effect(() => {
      if (this.saveDialogOpen()) untracked(() => this.comment.set(''));
    });
  }

  hasUnsavedChanges(): boolean {
    return this.dirty();
  }

  protected onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) event.preventDefault();
  }

  protected load(): void {
    const id = this.id();
    this.loadError.set(null);
    this.xml.set(null);
    this.ready.set(false);
    this.dirty.set(false);
    this.api
      .getModel(id)
      .pipe(
        switchMap((model) => {
          this.model.set(model);
          return this.api.getVersion(id, model.currentVersionNumber);
        }),
      )
      .subscribe({
        next: (version) => this.xml.set(version.xml),
        error: (problem: ProblemDetails) => this.loadError.set(problemMessage(problem)),
      });
  }

  protected onImported(warnings: string[]): void {
    this.ready.set(true);
    if (warnings.length > 0) {
      this.toasts.info(`Opened with ${warnings.length} warning(s): ${warnings[0]}`);
    }
  }

  protected async save(event: Event): Promise<void> {
    event.preventDefault();
    const modeler = this.modeler();
    if (!modeler || this.busy()) return;
    this.busy.set(true);
    let xml: string;
    try {
      xml = await modeler.saveXml();
    } catch (e) {
      this.busy.set(false);
      this.toasts.error(e instanceof Error ? e.message : String(e));
      return;
    }
    const comment = this.comment().trim();
    const id = this.id();
    this.api
      .createVersion(id, { xml, comment: comment || undefined })
      .pipe(
        // The save can change the process id; reload the model so the header stays accurate.
        switchMap((version) => this.api.getModel(id).pipe(map((model) => ({ version, model })))),
      )
      .subscribe({
        next: ({ version, model }) => {
          this.busy.set(false);
          this.saveDialogOpen.set(false);
          this.dirty.set(false);
          this.model.set(model);
          this.toasts.success(`Saved as v${version.versionNumber}.`);
          if (version.warnings?.length) this.toasts.info(version.warnings.join(' '));
        },
        error: (problem: ProblemDetails) => {
          this.busy.set(false);
          this.toasts.error(problemMessage(problem));
        },
      });
  }

  /** Downloads the diagram as it is on the canvas, including unsaved changes. */
  protected async export(): Promise<void> {
    const modeler = this.modeler();
    const model = this.model();
    if (!modeler || !model) return;
    try {
      const xml = await modeler.saveXml();
      const { utf8 } = exportFileName(model.name, model.currentVersionNumber);
      const fileName = this.dirty() ? utf8.replace(/\.bpmn$/, '-draft.bpmn') : utf8;
      saveFile({ blob: new Blob([xml], { type: 'application/xml' }), fileName });
    } catch (e) {
      this.toasts.error(e instanceof Error ? e.message : String(e));
    }
  }

  protected pickFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    if (this.dirty()) this.pendingImport.set(file);
    else void this.importFile(file);
  }

  protected confirmImport(): void {
    const file = this.pendingImport();
    this.pendingImport.set(null);
    if (file) void this.importFile(file);
  }

  /** Loads a local file onto the canvas. It becomes a version only when saved. */
  private async importFile(file: File): Promise<void> {
    const modeler = this.modeler();
    if (!modeler) return;
    const error = await modeler.importXml(await file.text());
    if (error === null) {
      this.dirty.set(true);
      this.toasts.info(`Opened ${file.name}. Save to keep it as a new version.`);
    } else {
      this.toasts.error(`${file.name} could not be opened: ${error}`);
    }
  }
}
