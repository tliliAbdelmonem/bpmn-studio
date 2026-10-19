import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BpmnModelDto, BpmnModelVersionDto } from '@bpmn-studio/shared';
import { of } from 'rxjs';
import { BpmnModeler } from '../../bpmn/bpmn-modeler';
import { ApiService } from '../../core/api.service';
import { ModelEditorPage } from './model-editor.page';

const model: BpmnModelDto = {
  id: 'm1',
  name: 'Order',
  description: null,
  processId: 'Process_1',
  currentVersionNumber: 2,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-02T00:00:00Z',
};

const version = (n: number, xml = '<v2/>'): BpmnModelVersionDto => ({
  id: `v${n}`,
  modelId: 'm1',
  versionNumber: n,
  comment: null,
  createdAt: '2026-01-03T00:00:00Z',
  xml,
});

/** Stands in for bpmn-js, which needs a real browser layout engine. */
@Component({
  selector: 'bs-bpmn-modeler',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: '',
  providers: [{ provide: BpmnModeler, useExisting: FakeModeler }],
})
class FakeModeler {
  readonly xml = input.required<string>();
  readonly imported = output<string[]>();
  readonly importFailed = output<string>();
  readonly changed = output<void>();
  saveXml = vi.fn(async () => '<edited/>');
  importXml = vi.fn(async (): Promise<string | null> => null);
}

function query<T extends Element>(root: HTMLElement, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`No element matches ${selector}`);
  return found;
}

async function render(api: Partial<ApiService>) {
  TestBed.configureTestingModule({
    imports: [ModelEditorPage],
    providers: [provideRouter([]), { provide: ApiService, useValue: api }],
  }).overrideComponent(ModelEditorPage, {
    remove: { imports: [BpmnModeler] },
    add: { imports: [FakeModeler] },
  });
  const fixture = TestBed.createComponent(ModelEditorPage);
  fixture.componentRef.setInput('id', 'm1');
  await fixture.whenStable();
  const fake = fixture.debugElement.query((d) => d.name === 'bs-bpmn-modeler')
    .componentInstance as FakeModeler;
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, fake, el, page: fixture.componentInstance };
}

describe('ModelEditorPage', () => {
  it('loads the current version into the modeler', async () => {
    const getVersion = vi.fn(() => of(version(2)));
    const { fake, el } = await render({ getModel: () => of(model), getVersion });
    expect(getVersion).toHaveBeenCalledWith('m1', 2);
    expect(fake.xml()).toBe('<v2/>');
    expect(el.textContent).toContain('Saved as v2');
  });

  it('tracks edits and saves them as a new version with the comment', async () => {
    const createVersion = vi.fn(() => of(version(3, '<edited/>')));
    const saved = { ...model, currentVersionNumber: 3 };
    const getModel = vi.fn().mockReturnValueOnce(of(model)).mockReturnValue(of(saved));
    const { fixture, fake, el, page } = await render({
      getModel,
      getVersion: () => of(version(2)),
      createVersion,
    });

    fake.imported.emit([]);
    fake.changed.emit();
    await fixture.whenStable();
    expect(el.textContent).toContain('Unsaved changes');
    expect(page.hasUnsavedChanges()).toBe(true);

    const textarea = query<HTMLTextAreaElement>(el, 'textarea[name="comment"]');
    textarea.value = '  Added a task ';
    textarea.dispatchEvent(new Event('input'));
    query<HTMLFormElement>(el, '#save-version-form').dispatchEvent(
      new Event('submit', { cancelable: true }),
    );
    await fixture.whenStable();

    expect(createVersion).toHaveBeenCalledWith('m1', { xml: '<edited/>', comment: 'Added a task' });
    expect(page.hasUnsavedChanges()).toBe(false);
    expect(el.textContent).toContain('Saved as v3');
  });

  it('marks an imported file as unsaved without storing it', async () => {
    const createVersion = vi.fn();
    const { fixture, fake, el, page } = await render({
      getModel: () => of(model),
      getVersion: () => of(version(2)),
      createVersion,
    });
    fake.imported.emit([]);
    await fixture.whenStable();

    const input = query<HTMLInputElement>(el, 'input[type="file"]');
    // jsdom's File has no text(); the page only needs the name and the content.
    const file = { name: 'order.bpmn', text: async () => '<from-file/>' };
    Object.defineProperty(input, 'files', { value: [file] });
    input.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    await vi.waitFor(() => expect(page.hasUnsavedChanges()).toBe(true));

    expect(fake.importXml).toHaveBeenCalledWith('<from-file/>');
    expect(createVersion).not.toHaveBeenCalled();
  });
});
