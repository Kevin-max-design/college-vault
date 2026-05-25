const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const artifactDir = '/Users/aremkevin/.gemini/antigravity/brain/ceb5ab5a-c81f-4f0a-a12a-909a57008904';
const mdPath = path.join(artifactDir, 'application_workflow.md');
const typPath = path.join(artifactDir, 'application_workflow.typ');
const pdfPath = path.join(artifactDir, 'application_workflow.pdf');

function parseMarkdownToTypst(mdContent) {
  let lines = mdContent.split('\n');
  let typstLines = [];
  
  // Design tokens & styling definitions
  typstLines.push(`// Design Tokens
#set page(
  paper: "a4",
  margin: (x: 2cm, y: 2.5cm),
  fill: rgb("FBF9F4"), // Paper base
  header: context {
    if counter(page).get().first() > 1 {
      align(right, text(fill: rgb("00595C"), size: 8.5pt, font: "Avenir Next", weight: "bold")[
        CAMPUSVAULT (RGMCET) — APPLICATION WORKFLOW
      ])
    }
  },
  footer: context {
    let page_num = counter(page).get().first()
    grid(
      columns: (1fr, 1fr),
      align(left, text(fill: rgb("6E7979"), size: 8pt, font: "Avenir")[
        Rajeev Gandhi Memorial College of Engineering & Technology
      ]),
      align(right, text(fill: rgb("6E7979"), size: 8pt, font: "Avenir Next", weight: "bold")[
        Page #page_num
      ])
    )
  }
)

#set text(
  font: "Georgia",
  size: 10.5pt,
  fill: rgb("1B1C19")
)

#set par(
  justify: true,
  leading: 0.72em,
)

// Styled Headings
#show heading: set text(fill: rgb("00595C"), font: "Georgia", weight: "bold")
#show heading.where(level: 1): set text(size: 20pt)
#show heading.where(level: 2): set text(size: 14pt)
#show heading.where(level: 3): set text(size: 11pt, fill: rgb("855300"))

#show heading: it => block(
  width: 100%,
  above: if it.level == 1 { 24pt } else if it.level == 2 { 20pt } else { 14pt },
  below: if it.level == 1 { 18pt } else if it.level == 2 { 12pt } else { 8pt },
  it
)


// Bullet lists styling
#set list(marker: text(fill: rgb("FEA619"), size: 10pt)[•])
`);

  // Title Block
  typstLines.push(`
#align(center)[
  #block(
    stroke: 3pt + rgb("00595C"),
    inset: 18pt,
    fill: rgb("FFFFFF"),
    radius: 2pt,
    width: 100%,
    [
      #text(size: 24pt, weight: "bold", fill: rgb("00595C"))[CampusVault]\
      #v(6pt)
      #text(size: 13pt, weight: "bold", fill: rgb("855300"), font: "Avenir Next")[RGMCET SYSTEM WORKFLOW BLUEPRINT]\
      #v(8pt)
      #text(size: 9pt, fill: rgb("6E7979"), font: "Avenir")[Technical Architecture & User Journey Documentation]
    ]
  )
]
#v(1.5em)
`);

  let inMermaid = false;
  let mermaidCode = [];
  let inTable = false;
  let tableRows = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];

    // Handle Title Heading (we override with center block above, so skip first h1)
    if (line.startsWith('# ') && i < 5) {
      continue;
    }

    // Fenced Code / Mermaid Blocks
    if (line.trim().startsWith('```')) {
      if (line.includes('mermaid')) {
        inMermaid = true;
        mermaidCode = [];
        continue;
      }
      if (inMermaid) {
        inMermaid = false;
        // Output Mermaid block beautifully
        typstLines.push(`
#block(
  fill: rgb("F0EEE9"),
  inset: 12pt,
  radius: 2pt,
  stroke: 1.5pt + rgb("00595C"),
  width: 100%,
  [
    #set text(fill: rgb("00595C"), font: "Avenir Next", size: 8.5pt, weight: "bold")
    #align(center)[[Diagram Architecture Specification]]
    #v(6pt)
    #set text(font: "Courier New", size: 8pt, fill: rgb("3E4949"))
    #raw("${mermaidCode.join('\\n').replace(/"/g, '\\"')}", block: true)
  ]
)
`);
        continue;
      }
      
      // Standard non-mermaid code block
      let lang = line.replace('```', '').trim();
      let codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      typstLines.push(`
#block(
  fill: rgb("F5F3EE"),
  inset: 10pt,
  radius: 2pt,
  stroke: 1pt + rgb("6E7979"),
  width: 100%,
  [
    #set text(font: "Courier New", size: 8pt)
    #raw("${codeLines.join('\\n').replace(/"/g, '\\"')}", block: true, lang: "${lang}")
  ]
)
`);
      continue;
    }

    if (inMermaid) {
      mermaidCode.push(line);
      continue;
    }

    // Markdown Table parsing
    if (line.trim().startsWith('|')) {
      if (line.includes('---')) {
        // Skip separator line
        continue;
      }
      inTable = true;
      let cols = line.split('|').map(c => c.trim()).filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);
      tableRows.push(cols);
      continue;
    } else {
      if (inTable) {
        inTable = false;
        // Compile Typst Table
        typstLines.push(`
#v(1em)
#table(
  columns: (1.5fr, 1.2fr, 2fr, 3fr),
  fill: (x, y) => if y == 0 { rgb("00595C") } else if calc.even(y) { rgb("F5F3EE") } else { rgb("FFFFFF") },
  stroke: 0.5pt + rgb("BEC9C9"),
  inset: 7pt,
  align: horizon,
  ${tableRows.map((row, idx) => {
    return row.map(col => {
      // Bold headers, normal body cells
      if (idx === 0) {
        return `[#text(fill: rgb("FFFFFF"), weight: "bold", size: 9pt, font: "Avenir Next")[${col}]]`;
      }
      // Formatting links or codes
      let formattedCol = col
        .replace(/`([^`]+)`/g, '#raw("$1")')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
      return `[#text(size: 8.5pt, font: "Avenir")[${formattedCol}]]`;
    }).join(',\n  ');
  }).join(',\n  ')}
)
#v(1em)
`);
        tableRows = [];
      }
    }

    // Headings
    if (line.startsWith('### ')) {
      typstLines.push(`=== ${line.substring(4)}`);
      continue;
    }
    if (line.startsWith('## ')) {
      typstLines.push(`== ${line.substring(3)}`);
      continue;
    }

    // Horizontal Rule
    if (line.trim() === '---') {
      typstLines.push('\n#line(length: 100%, stroke: 0.5pt + rgb("BEC9C9"))\n');
      continue;
    }

    // Convert asterisk lists to hyphen lists first
    let processedLine = line;
    if (processedLine.trim().startsWith('* ')) {
      processedLine = processedLine.replace(/^(\s*)\*\s+/, '$1- ');
    }

    // Bold, lists, normal text translation
    let typstLine = processedLine
      .replace(/\*\*([^*]+)\*\*/g, '*$1*') // Bold
      .replace(/`([^`]+)`/g, '`$1`');      // Inline code

    // Direct translation for standard lines
    typstLines.push(typstLine);
  }

  return typstLines.join('\n');
}

// Read markdown
const mdContent = fs.readFileSync(mdPath, 'utf8');

// Parse
const typstContent = parseMarkdownToTypst(mdContent);

// Save Typst
fs.writeFileSync(typPath, typstContent);
console.log(`Saved Typst file to ${typPath}`);

// Compile PDF
try {
  console.log('Compiling PDF...');
  execSync(`/opt/homebrew/bin/typst compile "${typPath}" "${pdfPath}"`);
  console.log(`Successfully compiled PDF to ${pdfPath}`);
} catch (err) {
  console.error('Compilation failed:', err.message);
  process.exit(1);
}
