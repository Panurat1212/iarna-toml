'use strict'
const test = require('tap').test
const TOML = require('../toml.js')
const TomlError = require('../lib/toml-parser.js').TomlError

const errors = {
  'text after table name': "[error]   if you didn't catch this, your parser is broken",
  'text after property set': 'string = "Anything other than tabs, spaces and newline after a keygroup or key value pair has ended should produce an error unless it is a comment"   like this',
  'text after inline list': `array = [
"This might most likely happen in multiline arrays",
Like here,
"or here,
and here"
]     End of array comment, forgot the #`,
  'text after numeric property set': `number = 3.14  pi <--again forgot the #         `,
  'invalid starting char': `@invalid = 23`,
  'non-equal after keyname': `this is = 'invalid'`,
  "don't redefine keys": `a = 1\na = 2`,
  'declare same table': `[a]\n[a]`,
  "don't extend inline lists": `a = []\n[[a]]`,
  "don't extend inline lists2": `[a]\nb = [{}]\n[[a.b]]`,
  "don't extend inline lists (with existing content)": `a = [{}]\n[[a]]`,
  'table redefines key in middle': `[a]\nb = 3\n[a.b.c]`,
  'table with invalid key': `[a!.b]`,
  'list with invalid key': `[[a!.b]]`,
  'invalid list end': `[[a.b] ]`,
  'list redefines key in middle': `[a]\nb = 3\n[[a.b.c]]`,
  'list redefines key in end': `[a]\nb = 3\n[[a.b]]`,
  'list redefines inline list at end': `[a.b]\nb = []\n[[a.b]]`,
  'list redefines inline list in middle': `[a.b]\nc = []\n[[a.b.c.d]]`,
  'extend an inline table': 'a = {abc= [{}]}\n [[a.abc]]',
  'table then list': `[a]\n[[a]]`,
  'key without value': `a =`,
  'unterminated key': `ab`,
  'unterminated literal string': `a = 'abc`,
  'unterminated basic string': `a = "abc`,
  'unterminated literal multi': `a = '''abc`,
  'unterminated basic multi': `a = """abc`,
  'invalid escape': 'a = "\\N"',
  'invalid codepoint long': 'a = "\\UD8D8D8D8"',
  'non-hex codepoint long': 'a = "\\UZZZZZZZZ"',
  'non-hex codepoint short': 'a = "\\uZZZZ"',
  'non-hex codepoint long mid': 'a = "\\U0ZZZZZZZ"',
  'non-hex codepoint short mid': 'a = "\\u0ZZZ"',
  'non-hex codepoint long end': 'a = "\\U0000000Z"',
  'non-hex codepoint short end': 'a = "\\u000Z"',
  'sign without number': 'a = -',
  'float without decimal': 'a = 1.',
  'float with non-numeric decimal': 'a = 1.a',
  'incomplete exponent': 'a = 1e',
  'incomplete exponent2': 'a = 1e+',
  'leading underscores': `a = __1`,
  'char in exponent': 'a = 1e3a',
  'char in exponent2': 'a = 1ea',
  'number with letters': 'a = +3abc',
  'still invalid': 'a = 2013a',
  'incomplete datetime': 'a = 2013-',
  'invalid datetime': 'a = 2013-a',
  'invalid datetime2': 'a = 2013-TT-00T--T--T--Z',
  'incomplete datetime2': 'a = 2013-12-01T00:00:00',
  'short-years invalid': 'a = 201-12-01T00:00:00Z',
  'incomplete datetime fraction': 'a = 2013-12-01T00:00:00.',
  'invalid tz part': 'a = 2013-12-01T00:00:00M',
  'incomplete datetime fraction w/tz': 'a = 2013-12-01T00:00:00.Z',
  'invalid datetime w/ underscores': 'a = 2013-12-01T00:00:0_0.0_0_0Z',
  'invalid char in miliseconds': 'a = 2013-12-01T00:00:00.M',
  'incomplete tz hour': 'a = 2013-12-01T00:00:00+1',
  'invalid tz hour': 'a = 2013-12-01T00:00:00+1a:00',
  'incomplete tz min': 'a = 2013-12-01T00:00:00+10',
  'incomplete tz min2': 'a = 2013-12-01T00:00:00+10:',
  'incomplete tz min3': 'a = 2013-12-01T00:00:00+10a',
  'incomplete tz min4': 'a = 2013-12-01T00:00:00+10:0',
  'invalid tz min': 'a = 2013-12-01T00:00:00+10:0a',
  'incomplete true': 'a = tru',
  'incomple false': 'a = fals',
  'invalid true': 'a = troo',
  'invalid false': 'a = fool',
  'incomplete list': 'a = [',
  'incomplete list2': 'a = [ 2 ',
  'invalid list': 'a = [ 2 A',
  'incomplete list3': 'a = [ 2,',
  'incomplete table': 'a = {',
  'incomplete table2': 'a = { a=1 ',
  'invalid table': 'a = { a=1 A',
  'incomplete table3': 'a = { a=1,',
  'signed leading underscores': `a = -__12`,
  'trailing underscores': `a = 12_`,
  'many middle underscores': `a = 1__2`,
  'decimal prefix underscores': 'a = 0._12',
  'decimal mid underscores': 'a = 0.1__2',
  'decimal post underscores': 'a = 0.12_',
  'exponent prefix': 'a = 1e+_2',
  'exponent mid': 'a = 1e1__2',
  'exponent post': 'a = 1e2_',
  'mixed float integer': 'a = [ 1, 1.0 ]',
  'mixed int str int': 'a = [ 1, "foo", 2 ]',
  'mixed str float': 'a = [ "foo", 2e1 ]',
  'mixed date bool': 'a = [ 2018-01-01T00:00:00Z, false ]',
  'mixed obj arr': 'a = [ [23], {a=42} ]',
  'multiline str as keyname': '"""a""" = 1',
  'string literal as keyname': "'a' = 1",
  'invalid unicode': 'a = "\\uD800"',
  'empty pre-dot': '[.abc]',
  'empty post-dot': '[abc.]',
  'empty mid-dot': '[abc..def]',
  'empty obj name': '[]',
  'unterminated name': '["abc\n"]',
  'no control chars': 'a = "\u001f"',
  'no control chars2': 'a = "\u0000"',
  'no multi control chars': 'a = """\u0000"""',
  'no control in keys': '"a\u0000" = 1',
  'partial month': 'a = 2013-1-12T00:00:00Z',
  'partial day': 'a = 2013-01-1T00:00:00Z',
  'partial hour': 'a = 2013-01-01T0:00:00Z',
  'partial min': 'a = 2013-01-01T00:0:00Z',
  'partial sec': 'a = 2013-01-01T00:00:0Z',
  'lone date': 'a = 2013-01-01',
  'lone date with more': 'a = 2013-01-01n',
  'lone date and hour': ' a = 2013-01-01T00 ',
  'lone date and hour with more': ' a = 2013-01-01T00n',
  'lone date and min': ' a = 2013-01-01T00:00 ',
  'lone date and min with more': ' a = 2013-01-01T00:00n',
  'lone date and hms.frac': ' a = 2013-01-01T00:00:00.00',
  'lone date and hms.frac with more': ' a = 2013-01-01T00:00:00.00n',
  'multi-line sstrs can only start at start': "a = 'abc''defghi'''",
  'multi-line dstrs can only start at start': 'a = "abc""defghi"""',
  'abort single-quoted string': "a = '"
}

test('should be errors', t => {
  Object.keys(errors).forEach(msg => {
    try {
      t.comment(TOML.parse(errors[msg]))
      t.fail(msg)
    } catch (ex) {
      t.comment(ex.message)
      t.ok(ex instanceof TomlError, msg)
    }
  })
  t.end()
})
