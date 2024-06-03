import ElementFactory from "../html-element-factory/ElementFactory";
import Loading, { EmojiConfig } from "../Loading";
import ArrayUtil from "../util/ArrayUtil";
import NodeUtil from "../util/NodeUtil";
import NumberUtil from "../util/NumberUtil";
import ObjectUtil from "../util/ObjectUtil";
import { HasSections, HasValue } from "../util/UtilTypes";


class ConditionedCharSequenceEditor extends HTMLElement implements HasSections<"addButton">, HasValue<EmojiConfig> {

    public addButton!:HTMLElement;

    get value() {
        const out:EmojiConfig.Entry[] = [];
        this.childNodes.forEach(child => {
            if (child instanceof ConditionedCharSequenceEditor.SequenceList) out.push(child.value);
        });

        return out;
    }

    set value(newVal:EmojiConfig) {
        NodeUtil.empty(this, ConditionedCharSequenceEditor.SequenceList);
        this.prepend(...newVal.map(e => new ConditionedCharSequenceEditor.SequenceList(e)));
    }

    public constructor(value:EmojiConfig) {
        super();

        this.initElement();

        this.value = value;
    }

    initElement():void {
        this.classList.add("in-section-gap", "in-section-padding");

        this.addButton = this.appendChild(
            ElementFactory.iconButton("add", () => {
                this.value = [...this.value, {
                    condition: ["date is", 1, 1],
                    sequences: { [ConditionedCharSequenceEditor.SequenceList.Entry.getRandomSequence()]: 1 }
                }];
            }, "Nieuw laadscherm toevoegen")
            .class("add-button", "center-content")
            .make()
        );
    }

}

namespace ConditionedCharSequenceEditor {

    export class SequenceList extends HTMLElement implements HasSections<"conditionEditor"|"addButton">, HasValue<EmojiConfig.Entry> {

        public conditionEditor!:SequenceList.ConditionEditor;
        public addButton!:HTMLElement;

        public get value() {
            const sequences:Record<string,number> = {};
            this.childNodes.forEach(child => {
                if (child instanceof SequenceList.Entry) {
                    const [sequence, weight] = child.value;
                    sequences[sequence] = weight;
                };
            });

            return { condition: this.conditionEditor.value, sequences: sequences };
        }

        public set value({condition, sequences}:EmojiConfig.Entry) {
            this.conditionEditor.value = condition;

            NodeUtil.empty(this, SequenceList.Entry);
            this.firstElementChild!.after(...Object.entries(sequences).map(e => {
                return new SequenceList.Entry(e, () => {
                    if (ObjectUtil.sizeOf(this.value.sequences) === 0) this.remove();
                });
            }));
        }

        constructor(value:EmojiConfig.Entry) {
            super();

            this.initElement();

            this.value = value;
        }

        initElement(): void {
            this.classList.add("flex-rows", "in-section-gap", "in-section-padding");

            this.conditionEditor = this.appendChild(new SequenceList.ConditionEditor(["date is", 1, 1]));

            this.addButton = this.appendChild(
                ElementFactory.iconButton("add", () => {
                    const { condition, sequences } = this.value;
                    this.value = { condition, sequences: { ...sequences, [SequenceList.Entry.getRandomSequence()]: 1 }};
                }, "Nieuwe optie toevoegen")
                .class("add-button")
                .make()
            );
        }

    }

    export namespace SequenceList {

        const MONTH_LENGTHS = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        export class ConditionEditor extends HTMLElement implements HasSections<"typeSelector"|"dateInput"|"monthSelector">, HasValue<EmojiConfig.Condition> {

            public typeSelector!:HTMLSelectElement & { value:EmojiConfig.Condition[0] };
            public dateInput!:HTMLInputElement;
            public monthSelector!:HTMLSelectElement & { value: `${number}`};

            public get value() {
                const type = this.typeSelector.value;

                switch (type) {
                    case "date is":
                        const month = Number.parseInt(this.monthSelector.value);
                        const date = NumberUtil.clamp(this.dateInput.valueAsNumber, 1, MONTH_LENGTHS[month], true);
                        return ["date is", month, date];
                        break;
                    case "is Easter Sunday": return ["is Easter Sunday"];
                    case "is Easter Monday": return ["is Easter Monday"];
                }

            }

            public set value(newVal:EmojiConfig.Condition) {
                this.typeSelector.value = newVal[0];
                this.typeSelector.dispatchEvent(new Event("change"));

                switch (newVal[0]) {
                    case "date is":
                        this.monthSelector.value = `${newVal[1]}`;
                        this.dateInput.valueAsNumber = newVal[2];
                        break;
                    case "is Easter Sunday":
                    case "is Easter Monday":
                        break;
                }
            }

            constructor(value:EmojiConfig.Condition) {
                super();

                this.initElement();
            }

            public initElement():void {
                this.classList.add("flex-columns", "center-content", "flex-wrap", "in-section-gap");

                // this.appendChild(
                //     ElementFactory.p("Wordt gebruikt")
                //     .class("no-margin")
                //     .make()
                // );

                this.typeSelector = this.appendChild(
                    ElementFactory.select({
                        "date is": "Op datum",
                        "is Easter Sunday": "Op 1e paasdag",
                        "is Easter Monday": "Op 2e paasdag"
                    })
                    .onValueChanged(val => {
                        switch (val) {
                            case "date is":
                                this.dateInput.parentElement!.hidden = false;
                                break;
                            case "is Easter Sunday":
                            case "is Easter Monday":
                                this.dateInput.parentElement!.hidden = true;
                                break;
                        }
                    })
                    .make()
                );

                this.appendChild(
                    ElementFactory.div(undefined, "flex-columns", "cross-axis-center", "in-section-gap")
                    .children(
                        this.dateInput = ElementFactory.input.number(1, 1, 31, 1)
                        .style({ width: "3.5em" })
                        .make(),
                        this.monthSelector = ElementFactory.select({
                            "1": "januari",
                            "2": "februari",
                            "3": "maart",
                            "4": "april",
                            "5": "mei",
                            "6": "juni",
                            "7": "juli",
                            "8": "augustus",
                            "9": "september",
                            "10": "oktober",
                            "11": "november",
                            "12": "december",
                        })
                        .make()
                    )
                    .make()
                );
            }

        }

        customElements.define("char-sequence-list-condition-editor", ConditionEditor);

        export class Entry extends HTMLElement implements HasSections<"weight"|"sequence"|"showPreviewButton"|"removeButton">, HasValue<[string,number]> {

            private static readonly EMOJIS = Array.from(new Intl.Segmenter("en-US", { granularity: "grapheme" }).segment("😀😂😄😎😍🥰🤩🤗🤔😴🫠🥴🐐🧶🧦")).map(s => s.segment);
            public static getRandomSequence(length=3):string {
                return ArrayUtil.pickNFrom(3, this.EMOJIS).join("");
            }

            public weight!:HTMLInputElement;
            public sequence!:HTMLInputElement;
            public showPreviewButton!:HTMLElement;
            public removeButton!:HTMLElement;

            private readonly onRemove:VoidFunction;

            public get value():[string,number] {
                return [this.sequence.value.trim(), this.weight.value ? this.weight.valueAsNumber : 1];
            }

            public set value([sequence, weight]) {
                this.sequence.value = sequence;
                this.weight.valueAsNumber = weight;
            }

            constructor(value:[string,number], onRemove=() => {}) {
                super();

                this.onRemove = onRemove;

                this.initElement();

                this.value = value;
            }

            initElement():void {
                this.classList.add("flex-columns", "cross-axis-center", "in-section-gap");

                this.appendChild( // weight
                    ElementFactory.div(undefined, "flex-columns", "in-section-gap")
                    .children(
                        ElementFactory.p("ifl")
                        .class("icon", "no-margin"),
                        this.weight = ElementFactory.input.number(1, 1, 99, 1)
                        .class("weight")
                        .on("change", (_, self) => self.valueAsNumber = NumberUtil.clamp(Math.round(self.valueAsNumber), 0, 99))
                        .make()
                    )
                    .tooltip("Kans")
                    .make()
                );

                this.appendChild( // sequence input
                    this.sequence = ElementFactory.input.text()
                    .class("sequence")
                    .tooltip("Karakters")
                    .make()
                );

                this.showPreviewButton = this.appendChild(
                    ElementFactory.iconButton("preview", () => Loading.showLoadingScreen(this.value[0], true), "Toon voorbeeld (3 sec.)")
                    .make()
                );

                this.removeButton = this.appendChild(
                    ElementFactory.iconButton("remove", () => {
                        this.remove();
                        this.onRemove();
                    }, "Optie verwijderen")
                    .make()
                );
            }
            
        }

        customElements.define("char-sequence-list-entry", Entry);

    }

    customElements.define("char-sequence-list", SequenceList);

}

export default ConditionedCharSequenceEditor;

customElements.define("conditioned-char-sequence-editor", ConditionedCharSequenceEditor);