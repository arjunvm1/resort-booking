const fs = require("fs")
const ts = require("typescript")
const path = require("path")
const source = fs.readFileSync("src/App.tsx", "utf8")
const ast = ts.createSourceFile("App.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const functions = new Map(
  ast.statements.filter(ts.isFunctionDeclaration).map((n) => [n.name.text, n]),
)
const modules = new Map()
const register = (name, file, text, type = false) => {
  modules.set(name, { file, type })
  return text
}
const write = (file, text) => {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, text + "\n")
}
const prelude = source.slice(source.indexOf("const photo"), functions.get("Brand").getStart(ast))
const shared = ts.createSourceFile(
  "shared.ts",
  prelude,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TS,
)
let data = "",
  types = "",
  utils = ""
for (const n of shared.statements) {
  const name = ts.isTypeAliasDeclaration(n)
    ? n.name.text
    : n.declarationList.declarations[0].name.text
  const file = ts.isTypeAliasDeclaration(n)
    ? "src/types/booking.ts"
    : ["photo", "money", "date"].includes(name)
      ? "src/utils/format.ts"
      : "src/data/resort.ts"
  const text = register(name, file, "export " + n.getText(shared), ts.isTypeAliasDeclaration(n))
  if (file.includes("/types/")) types += text + "\n"
  else if (file.includes("/utils/")) utils += text + "\n"
  else data += text + "\n"
}
write("src/types/booking.ts", types)
write("src/utils/format.ts", utils)
write(
  "src/data/resort.ts",
  'import type { Stay } from "../types/booking"\nimport { photo } from "../utils/format"\n\n' +
    data,
)
const paths = {
  Brand: "components/layout",
  Header: "components/layout",
  Footer: "components/layout",
  Search: "components/booking",
  Summary: "components/booking",
  RoomCard: "components/rooms",
  Home: "pages",
  Listing: "pages",
  Detail: "pages",
  Checkout: "pages",
  Lookup: "pages",
  Admin: "pages",
  Policy: "pages",
  App: "src",
}
const bodies = new Map()
for (const [name, node] of functions) {
  const file = name === "App" ? "src/App.tsx" : `src/${paths[name]}/${name}.tsx`
  register(name, file, "")
  bodies.set(name, node.getText(ast))
}
const home = functions.get("Home")
let sections = []
function visit(n) {
  if (ts.isJsxElement(n) && n.openingElement.tagName.getText(ast) === "section") sections.push(n)
  else ts.forEachChild(n, visit)
}
visit(home)
const sectionNames = [
  "HeroSection",
  "IntroductionSection",
  "FeaturedStaysSection",
  "ExperiencesSection",
  "AmenitiesSection",
  "GallerySection",
  "TestimonialSection",
  "ContactSection",
]
let homeText = bodies.get("Home")
for (let i = sections.length - 1; i >= 0; i--) {
  const section = sections[i]
  const name = sectionNames[i]
  let jsx = section.getText(ast)
  const gallery = name === "GallerySection"
  if (gallery) jsx = jsx.replaceAll("setLightbox", "onEnlarge")
  const body = `function ${name}(${gallery ? "{ onEnlarge }: { onEnlarge: (src: string) => void }" : ""}) {\n  return (\n${jsx}\n  )\n}`
  register(name, `src/components/home/${name}.tsx`, "")
  bodies.set(name, body)
  homeText =
    homeText.slice(0, section.getStart(ast) - home.getStart(ast)) +
    `<${name}${gallery ? " onEnlarge={setLightbox}" : ""} />` +
    homeText.slice(section.end - home.getStart(ast))
}
bodies.set("Home", homeText)
const external = new Map()
for (const n of ast.statements.filter(ts.isImportDeclaration)) {
  if (n.importClause?.namedBindings && ts.isNamedImports(n.importClause.namedBindings))
    for (const el of n.importClause.namedBindings.elements)
      external.set(el.name.text, n.moduleSpecifier.text)
}
for (const [name, body] of bodies) {
  const file = modules.get(name).file
  const parsed = ts.createSourceFile(
    "component.tsx",
    body,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  )
  const ids = new Set()
  function scan(n) {
    if (ts.isIdentifier(n)) ids.add(n.text)
    ts.forEachChild(n, scan)
  }
  scan(parsed)
  const grouped = new Map()
  let imports = []
  for (const id of ids) {
    if (id === name) continue
    if (external.has(id)) {
      const mod = external.get(id)
      if (!grouped.has(mod)) grouped.set(mod, [])
      grouped.get(mod).push(id)
    } else if (modules.has(id)) {
      const m = modules.get(id)
      let rel = path
        .relative(path.dirname(file), m.file)
        .replaceAll("\\", "/")
        .replace(/\.(tsx|ts)$/, "")
      if (!rel.startsWith(".")) rel = "./" + rel
      imports.push(`import ${m.type ? "type " : ""}{ ${id} } from "${rel}"`)
    }
  }
  for (const [mod, names] of grouped)
    imports.unshift(`import { ${names.join(", ")} } from "${mod}"`)
  if (name === "App") imports.push('import "./App.css"')
  write(
    file,
    imports.join("\n") + "\n\nexport " + body + (name === "App" ? "\n\nexport default App" : ""),
  )
}
console.log(
  "Extracted " +
    (bodies.size - 1) +
    " components and pages, plus shared data, types, and utilities.",
)
