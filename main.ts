import { Plugin } from 'obsidian';
import { StateField, RangeSetBuilder, EditorSelection } from '@codemirror/state';
import { Decoration, DecorationSet, EditorView } from '@codemirror/view';

const revealDeco = Decoration.mark({ class: 'privacy-mode-reveal' });

const revealSelectionFontField: StateField<DecorationSet> = StateField.define<DecorationSet>({
    create() {
        return Decoration.none;
    },
    update(decorations, transaction) {
        if (!transaction.selection || !transaction.selection.eq(transaction.startState.selection) || transaction.docChanged) {
            const builder = new RangeSetBuilder<Decoration>();
            const selection: EditorSelection = transaction.state.selection;

            for (const range of selection.ranges) {
                if (!range.empty) builder.add(range.from, range.to, revealDeco);
            }
            return builder.finish();
        }
        return decorations.map(transaction.changes);
    },
    provide: field => EditorView.decorations.from(field),
});

interface PrivacyModeSettings {
	enabled: boolean;
}

const DEFAULT_SETTINGS: PrivacyModeSettings = {
	enabled: false
}

export default class PrivacyModePlugin extends Plugin {
	settings: PrivacyModeSettings;

	async onload() {
		await this.loadSettings();

		// Apply initial state
		this.applyPrivacyModeClass(this.settings.enabled);

		// Register CodeMirror extension to reveal real font for selected ranges
		this.registerEditorExtension(revealSelectionFontField);

		// Command: Enable Privacy Mode
		this.addCommand({
			id: 'enable-privacy-mode',
			name: 'Enable',
			checkCallback: (checking) => {
				if (this.settings.enabled) return false;
				if (!checking) {
					this.settings.enabled = true;
					this.applyPrivacyModeClass(true);
					this.saveSettings();
				}
				return true;
			}
		});

		// Command: Disable Privacy Mode
		this.addCommand({
			id: 'disable-privacy-mode',
			name: 'Disable',
			checkCallback: (checking) => {
				if (!this.settings.enabled) return false;
				if (!checking) {
					this.settings.enabled = false;
					this.applyPrivacyModeClass(false);
					this.saveSettings();
				}
				return true;
			}
		});
	}

	onunload() {
		this.applyPrivacyModeClass(false);
	}

	private applyPrivacyModeClass(enabled: boolean) {
		const root = this.app.workspace.containerEl;
		root.toggleClass('privacy-mode-enabled', enabled);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
