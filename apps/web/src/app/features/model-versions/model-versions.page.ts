import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  BpmnModelDto,
  BpmnModelVersionDto,
  BpmnModelVersionSummaryDto,
  ProblemDetails,
} from '@bpmn-studio/shared';
import { forkJoin } from 'rxjs';
import { ApiService, problemMessage } from '../../core/api.service';
import { saveFile } from '../../core/download';
import { ToastService } from '../../core/toast.service';
import { BpmnViewer } from '../../bpmn/bpmn-viewer';
import { Button } from '../../shared/ui/button';
import { ConfirmDialog } from '../../shared/ui/confirm-dialog';

@Component({
  selector: 'bs-model-versions-page',
  imports: [DatePipe, RouterLink, Button, ConfirmDialog, BpmnViewer],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex h-[calc(100dvh-8.5rem)] min-h-[28rem] flex-col' },
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
      <div class="mt-2 flex flex-wrap items-center gap-3">
        <h1 class="me-auto text-2xl font-semibold">Version history</h1>
        <a bsButton="secondary" [routerLink]="['/models', id(), 'edit']">Open editor</a>
        @if (selected(); as version) {
          <button
            type="button"
            bsButton="secondary"
            [disabled]="busy()"
            (click)="export(version.versionNumber)"
          >
            Export v{{ version.versionNumber }}
          </button>
          <button
            type="button"
            bsButton
            [disabled]="busy() || version.versionNumber === model()?.currentVersionNumber"
            [title]="
              version.versionNumber === model()?.currentVersionNumber
                ? 'This is the current version'
                : ''
            "
            (click)="pendingRestore.set(version.versionNumber)"
          >
            Restore v{{ version.versionNumber }}
          </button>
        }
      </div>

      <div class="mt-4 flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
        <ol
          class="flex max-h-48 shrink-0 flex-col gap-1 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 md:max-h-none md:w-72"
          aria-label="Versions"
        >
          @for (version of versions(); track version.id) {
            <li>
              <button
                type="button"
                [attr.aria-current]="version.versionNumber === selectedNumber() ? 'true' : null"
                class="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50 aria-[current]:bg-indigo-50 aria-[current]:ring-1 aria-[current]:ring-indigo-200"
                (click)="selectedNumber.set(version.versionNumber)"
              >
                <span class="flex items-center gap-2">
                  <span class="font-medium">v{{ version.versionNumber }}</span>
                  @if (version.versionNumber === model()?.currentVersionNumber) {
                    <span class="rounded bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-800"
                      >current</span
                    >
                  }
                  <span class="ms-auto text-xs text-slate-500">{{
                    version.createdAt | date: 'short'
                  }}</span>
                </span>
                @if (version.comment) {
                  <span class="mt-0.5 block truncate text-slate-600" [title]="version.comment">{{
                    version.comment
                  }}</span>
                }
              </button>
            </li>
          } @empty {
            <li class="px-3 py-2 text-sm text-slate-500">Loading versions…</li>
          }
        </ol>

        <section
          class="relative min-h-72 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white"
          aria-label="Diagram preview"
        >
          @if (selected(); as version) {
            <bs-bpmn-viewer [xml]="version.xml" />
          } @else if (selectedNumber() !== null) {
            <p class="p-4 text-sm text-slate-500">Loading diagram…</p>
          }
        </section>
      </div>
    }

    <bs-confirm-dialog
      [open]="pendingRestore() !== null"
      heading="Restore this version?"
      [message]="
        'A new version v' +
        ((model()?.currentVersionNumber ?? 0) + 1) +
        ' will be created with the content of v' +
        pendingRestore() +
        '. Existing versions are kept.'
      "
      confirmLabel="Restore"
      [busy]="busy()"
      (confirmed)="confirmRestore()"
      (cancelled)="pendingRestore.set(null)"
    />
  `,
})
export class ModelVersionsPage {
  /** Route parameter (`/models/:id/versions`). */
  readonly id = input.required<string>();

  private readonly api = inject(ApiService);
  private readonly toasts = inject(ToastService);

  protected readonly model = signal<BpmnModelDto | null>(null);
  protected readonly versions = signal<BpmnModelVersionSummaryDto[]>([]);
  protected readonly loadError = signal<string | null>(null);
  protected readonly selectedNumber = signal<number | null>(null);
  protected readonly busy = signal(false);
  protected readonly pendingRestore = signal<number | null>(null);
  /** Full versions (with XML) fetched so far, by version number. Versions are immutable. */
  private readonly xmlCache = signal<ReadonlyMap<number, BpmnModelVersionDto>>(new Map());

  protected readonly selected = computed(() => {
    const n = this.selectedNumber();
    return n === null ? null : (this.xmlCache().get(n) ?? null);
  });

  constructor() {
    effect(() => {
      this.id();
      untracked(() => this.load());
    });
    effect(() => {
      const n = this.selectedNumber();
      if (n !== null && !untracked(this.xmlCache).has(n)) untracked(() => this.fetchVersion(n));
    });
  }

  protected load(): void {
    const id = this.id();
    this.loadError.set(null);
    this.xmlCache.set(new Map());
    forkJoin([this.api.getModel(id), this.api.listVersions(id)]).subscribe({
      next: ([model, versions]) => {
        this.model.set(model);
        this.versions.set(versions);
        this.selectedNumber.set(model.currentVersionNumber);
      },
      error: (problem: ProblemDetails) => this.loadError.set(problemMessage(problem)),
    });
  }

  protected export(versionNumber: number): void {
    this.busy.set(true);
    this.api.exportVersion(this.id(), versionNumber).subscribe({
      next: (file) => {
        this.busy.set(false);
        saveFile(file);
      },
      error: (problem: ProblemDetails) => this.fail(problem),
    });
  }

  protected confirmRestore(): void {
    const n = this.pendingRestore();
    if (n === null) return;
    this.busy.set(true);
    this.api.restoreVersion(this.id(), n).subscribe({
      next: (version) => {
        this.busy.set(false);
        this.pendingRestore.set(null);
        this.model.update((m) => m && { ...m, currentVersionNumber: version.versionNumber });
        this.versions.update((list) => [version, ...list]);
        this.xmlCache.update((cache) => new Map(cache).set(version.versionNumber, version));
        this.selectedNumber.set(version.versionNumber);
        this.toasts.success(`Restored v${n} as v${version.versionNumber}.`);
      },
      error: (problem: ProblemDetails) => this.fail(problem),
    });
  }

  private fetchVersion(n: number): void {
    this.api.getVersion(this.id(), n).subscribe({
      next: (version) =>
        this.xmlCache.update((cache) => new Map(cache).set(version.versionNumber, version)),
      error: (problem: ProblemDetails) => this.toasts.error(problemMessage(problem)),
    });
  }

  private fail(problem: ProblemDetails): void {
    this.busy.set(false);
    this.toasts.error(problemMessage(problem));
  }
}
