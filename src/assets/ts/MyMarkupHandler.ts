class main {
    private static RenderHtml(markIn: HTMLTextAreaElement, markOut: HTMLLabelElement): void {
        if (markIn.value) {
            markOut.innerHTML = Markdown.toHtml(markIn.value)
        }
    }

    public static TransformMarkup(idIn: string, idOut: string) {
        const markIn = <HTMLTextAreaElement>document.getElementById(idIn);
        const markOut = <HTMLLabelElement>document.getElementById(idOut);

        if (markIn) {
            markIn.oninput = () => {
                this.RenderHtml(markIn, markOut);
            }
            window.onload = () => {
                this.RenderHtml(markIn, markOut);
            }
        }
    }
}

class TagTypeToHtml {
    private readonly markToTagMap: Map<string, string> = new Map([
        ["#", "h1"],
        ["##", "h2"],
        ["###", "h3"],
        ["---", "hr"],
        ["**", "b"]
    ]);

    private GetTag(i_tagType: string, opening: string): string {
        let tag: string | undefined = this.markToTagMap.get(i_tagType);

        if (!tag) tag = "p";

        return `${opening}${tag}>`;
    }

    public HasTag(tagTest: string): boolean {
        return this.markToTagMap.get(tagTest) != undefined;
    }

    public OpeningTag(i_tagType: string): string {
        return this.GetTag(i_tagType, "<");
    }

    public ClosingTag(i_tagType: string): string {
        return this.GetTag(i_tagType, "</");
    }
}

class StringAdder {
    private _content: string = "";

    public Add(substring: string) {
        this._content += substring;
    }

    public get content() { return this._content };
}

class Markdown {
    public static toHtml(markdown: string): string {
        const formatedHtml = new StringAdder();
        const lines: string[] = markdown.split('\n');

        lines.forEach(line => {
            const parsedLine = LineParser.ParseLine(line);
            formatedHtml.Add(parsedLine);
        });

        return formatedHtml.content;
    }
}

class LineParser {
    private static FindTag(line: string): string {
        const tagType = new TagTypeToHtml();
        const firstWord = line.substring(0, line.indexOf(' '));

        if (tagType.HasTag(firstWord)) {
            return firstWord;
        } else return "";
    }

    public static ParseLine(line: string): string {
        const tagType = new TagTypeToHtml();
        const tag = this.FindTag(line);
        const restOfLine = LineParser.GetRestOfLine(line, tag);
        return `${tagType.OpeningTag(tag)}${restOfLine}${tagType.ClosingTag(tag)}`;
    }

    public static GetRestOfLine(line: string, tag: string) {
        return line.slice(tag.length + (tag != "" ? 1 : 0));
    }
}
