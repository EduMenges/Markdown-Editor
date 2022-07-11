class HtmlHandler {
    private RenderHtmlContent(markdown: HTMLTextAreaElement, markdownOutput: HTMLLabelElement): void {
        if (markdown.value) {
            markdownOutput.innerHTML = Markdown.ToHtml(markdown.value);
        } else {
            markdownOutput.innerHTML = "<p><p>";
        }
    }

    public TextChangeHandler(id: string, output: string): void {
        const markdownInput = <HTMLTextAreaElement>document.getElementById(id);
        const markdownOutput = <HTMLLabelElement>document.getElementById(output);

        if (markdownInput) {
            markdownInput.oninput = () => {
                this.RenderHtmlContent(markdownInput, markdownOutput);
            }
            window.onload = () => {
                this.RenderHtmlContent(markdownInput, markdownOutput);
            }
        }
    }
}

enum TagType {
    Paragraph,
    Header1,
    Header2,
    Header3,
    HorizontalRule
}

class TagTypeToHtml {
    private readonly tagType: Map<TagType, string> = new Map([
        [TagType.Paragraph, "p"],
        [TagType.Header1, "h1"],
        [TagType.Header2, "h2"],
        [TagType.Header3, "h3"],
        [TagType.HorizontalRule, "hr"]
    ]);

    private GetTag(i_tagType: TagType, opening: string): string {
        let tag = this.tagType.get(i_tagType);

        if (!tag) tag = "p";

        return `${opening}${tag}>`;
    }

    public OpeningTag(i_tagType: TagType): string {
        return this.GetTag(i_tagType, "<");
    }

    public ClosingTag(i_tagType: TagType): string {
        return this.GetTag(i_tagType, "</");
    }
}

interface IMarkdownDocument {
    Add(...content: string[]): void;
    Get(): string;
}

class MarkdownDocument implements IMarkdownDocument {
    private content: string = "";

    Add(...content: string[]): void {
        content.forEach(element => {
            this.content += element;
        })
    }

    Get() { return this.content }
}

class ParseElement {
    currentLine: string = "";
}

interface IVisitor {
    Visit(token: ParseElement, markdownDocument: IMarkdownDocument): void;
}

abstract class VisitorBase implements IVisitor {
    constructor(private readonly tagType: TagType, private readonly tagTypeToHtml: TagTypeToHtml) { }

    Visit(token: ParseElement, markdownDocument: IMarkdownDocument): void {
        markdownDocument.Add(this.tagTypeToHtml.OpeningTag(this.tagType),
            token.currentLine,
            this.tagTypeToHtml.OpeningTag(this.tagType));
    }
}

class Header1Visitor extends VisitorBase {
    constructor() {
        super(TagType.Header1, new TagTypeToHtml());
    }
}
class Header2Visitor extends VisitorBase {
    constructor() {
        super(TagType.Header2, new TagTypeToHtml());
    }
}
class Header3Visitor extends VisitorBase {
    constructor() {
        super(TagType.Header3, new TagTypeToHtml());
    }
}
class ParagraphVisitor extends VisitorBase {
    constructor() {
        super(TagType.Paragraph, new TagTypeToHtml());
    }
}
class HorizontalRuleVisitor extends VisitorBase {
    constructor() {
        super(TagType.HorizontalRule, new TagTypeToHtml());
    }
}

interface IVisitable {
    Accept(visitor: IVisitor, token: ParseElement, markdownDocument: IMarkdownDocument): void
}

class Visitable implements IVisitable {
    Accept(visitor: IVisitor, token: ParseElement, markdownDocument: IMarkdownDocument): void {
        visitor.Visit(token, markdownDocument);
    }
}

abstract class Handler<T> {
    protected next: Handler<T> | null = null;

    public SetNext(next: Handler<T>): void {
        this.next = next;
    }

    protected abstract CanHandle(request: T): boolean;

    public HandleRequest(request: T): void {
        if (!this.CanHandle(request)) {
            if (this.next) {
                this.next.HandleRequest(request);
            }
        }
    }
}

class LineParser {
    public static Parse(value: string, tag: string): [boolean, string] {
        let output: [boolean, string] = [false, ""];

        output[1] = value;
        if (value !== "") {
            const hasTag = value.startsWith(`${tag}`);
            if (hasTag) {
                output[0] = true;
                output[1] = value.substring(tag.length);
            }
        }

        return output;
    }
}

class ParseChainHandler extends Handler<ParseElement> {
    private readonly visitable: IVisitable = new Visitable();

    constructor(private readonly document: IMarkdownDocument,
        private readonly tagType: string,
        private readonly visitor: IVisitor) {
        super();
    }

    protected CanHandle(request: ParseElement): boolean {
        let split = LineParser.Parse(request.currentLine, this.tagType);

        if (split[0]) {
            request.currentLine = split[1];
            this.visitable.Accept(this.visitor, request, this.document);
        }

        return split[0];
    }
}

class ParagraphHandler extends Handler<ParseElement> {
    private readonly visitable: IVisitable = new Visitable();
    private readonly visitor: IVisitor = new ParagraphVisitor();

    constructor(private readonly document: IMarkdownDocument) { super() }

    protected CanHandle(request: ParseElement): boolean {
        this.visitable.Accept(this.visitor, request, this.document);
        return true;
    }
}

class Header1ChainHandler extends ParseChainHandler {
    constructor(document: IMarkdownDocument) {
        super(document, "# ", new Header1Visitor());
    }
}

class Header2ChainHandler extends ParseChainHandler {
    constructor(document: IMarkdownDocument) {
        super(document, "## ", new Header2Visitor());
    }
}

class Header3ChainHandler extends ParseChainHandler {
    constructor(document: IMarkdownDocument) {
        super(document, "### ", new Header3Visitor());
    }
}

class HorizontalRuleHandler extends ParseChainHandler {
    constructor(document: IMarkdownDocument) {
        super(document, "---", new HorizontalRuleVisitor());
    }
}

class ChainOfResponsibilityFactory {
    static Build(document: IMarkdownDocument): ParseChainHandler {
        let header1: Header1ChainHandler = new Header1ChainHandler(document);
        let header2: Header2ChainHandler = new Header2ChainHandler(document);
        let header3: Header3ChainHandler = new Header3ChainHandler(document);
        let horizontalRule: HorizontalRuleHandler = new HorizontalRuleHandler(document);
        let paragraph: ParagraphHandler = new ParagraphHandler(document);

        header1.SetNext(header2);
        header2.SetNext(header3);
        header3.SetNext(horizontalRule);
        horizontalRule.SetNext(paragraph);

        return header1;
    }
}

class Markdown {
    public static ToHtml(text: string): string {
        const document: IMarkdownDocument = new MarkdownDocument();
        const header1: Header1ChainHandler = ChainOfResponsibilityFactory.Build(document);
        const lines: string[] = text.split('\n');

        for (let index = 0; index < lines.length; index++) {
            const parseElement: ParseElement = new ParseElement();
            parseElement.currentLine = lines[index];
            header1.HandleRequest(parseElement);
        }

        return document.Get();
    }
}
