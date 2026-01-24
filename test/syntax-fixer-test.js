/* global describe it */
var chai = require('chai')
var syntaxFixer = require('../lib/plantuml-syntax-fixer')

var expect = chai.expect

describe('PlantUML Syntax Fixer', function () {
  describe('#fixPlantUmlSyntax()', function () {
    it('should not modify code when autoFix is disabled', function () {
      var code = 'A -> B: label with <special> chars'
      var fixed = syntaxFixer.fixPlantUmlSyntax(code, { autoFix: false })
      expect(fixed).to.equal(code)
    })

    it('should not modify code when autoFix is not set', function () {
      var code = 'A -> B: label with <special> chars'
      var fixed = syntaxFixer.fixPlantUmlSyntax(code, {})
      expect(fixed).to.equal(code)
    })

    it('should fix unquoted arrow labels with special characters', function () {
      var code = '@startuml\nA -> B: label with <special> chars\n@enduml'
      var fixed = syntaxFixer.fixPlantUmlSyntax(code, { autoFix: true, warnOnFix: false })
      expect(fixed).to.include('"label with <special> chars"')
    })

    it('should fix unquoted class names with special characters', function () {
      var code = '@startuml\nclass MyClass<Type> {\n}\n@enduml'
      var fixed = syntaxFixer.fixPlantUmlSyntax(code, { autoFix: true, warnOnFix: false })
      expect(fixed).to.include('class "MyClass<Type>"')
    })

    it('should fix unquoted participant names with special characters', function () {
      var code = '@startuml\nparticipant User<Admin> as U\n@enduml'
      var fixed = syntaxFixer.fixPlantUmlSyntax(code, { autoFix: true, warnOnFix: false })
      expect(fixed).to.include('participant "User<Admin>"')
    })

    it('should fix unquoted title with special characters', function () {
      var code = '@startuml\ntitle My Diagram <v1.0>\n@enduml'
      var fixed = syntaxFixer.fixPlantUmlSyntax(code, { autoFix: true, warnOnFix: false })
      expect(fixed).to.include('title "My Diagram <v1.0>"')
    })

    it('should not fix already quoted text', function () {
      var code = '@startuml\nA -> B: "already quoted"\n@enduml'
      var fixed = syntaxFixer.fixPlantUmlSyntax(code, { autoFix: true, warnOnFix: false })
      expect(fixed).to.include('"already quoted"')
      // Should not add extra quotes
      expect(fixed.match(/"/g).length).to.equal(2)
    })

    it('should handle Chinese characters correctly', function () {
      var code = '@startuml\nclass 用户类<类型> {\n}\n@enduml'
      var fixed = syntaxFixer.fixPlantUmlSyntax(code, { autoFix: true, warnOnFix: false })
      // Chinese characters with < > should be quoted
      expect(fixed).to.include('"用户类<类型>"')
    })

    it('should normalize whitespace when enabled', function () {
      var code = '@startuml\n\n\n\nA -> B\n\n\n\n@enduml'
      var fixed = syntaxFixer.fixPlantUmlSyntax(code, {
        autoFix: true,
        warnOnFix: false,
        normalizeWhitespace: true
      })
      // Should reduce multiple blank lines to max 2
      expect(fixed).to.not.include('\n\n\n\n')
    })

    it('should not normalize whitespace when disabled', function () {
      var code = '@startuml\n\n\n\nA -> B\n\n\n\n@enduml'
      var fixed = syntaxFixer.fixPlantUmlSyntax(code, {
        autoFix: true,
        warnOnFix: false,
        normalizeWhitespace: false
      })
      // Should keep original whitespace
      expect(fixed).to.include('\n\n\n\n')
    })
  })

  describe('#needsQuoting()', function () {
    it('should return true for text with special characters', function () {
      expect(syntaxFixer.needsQuoting('text with <special>')).to.equal(true)
      expect(syntaxFixer.needsQuoting('text: with colon')).to.equal(true)
      expect(syntaxFixer.needsQuoting('text (with parens)')).to.equal(true)
    })

    it('should return false for already quoted text', function () {
      expect(syntaxFixer.needsQuoting('"already quoted"')).to.equal(false)
      expect(syntaxFixer.needsQuoting("'already quoted'")).to.equal(false)
    })

    it('should return true for text with spaces', function () {
      expect(syntaxFixer.needsQuoting('text with spaces')).to.equal(true)
    })

    it('should return false for simple identifiers', function () {
      expect(syntaxFixer.needsQuoting('SimpleIdentifier')).to.equal(false)
      expect(syntaxFixer.needsQuoting('simple_identifier')).to.equal(false)
    })
  })

  describe('#quoteIfNeeded()', function () {
    it('should quote text with special characters', function () {
      expect(syntaxFixer.quoteIfNeeded('text <special>')).to.equal('"text <special>"')
    })

    it('should not double-quote already quoted text', function () {
      expect(syntaxFixer.quoteIfNeeded('"already quoted"')).to.equal('"already quoted"')
    })

    it('should escape internal quotes', function () {
      expect(syntaxFixer.quoteIfNeeded('text with "quote"')).to.equal('"text with \\"quote\\""')
    })
  })

  describe('Standalone fixSyntax service', function () {
    var plantuml = require('../lib/node-plantuml')

    it('should export fixSyntax from main module', function (done) {
      expect(plantuml.fixSyntax).to.be.a('function')
      done()
    })

    it('should not modify valid code', function (done) {
      var code = '@startuml\nA -> B: Hello\n@enduml'
      plantuml.fixSyntax(code, function (err, fixed, wasFixed) {
        expect(err).to.equal(null)
        expect(wasFixed).to.equal(false)
        expect(fixed).to.equal(code)
        done()
      })
    })

    it('should not modify simple class definitions', function (done) {
      var code = '@startuml\nclass MyClass {\n  +method()\n}\n@enduml'
      plantuml.fixSyntax(code, function (err, fixed, wasFixed) {
        expect(err).to.equal(null)
        expect(wasFixed).to.equal(false)
        expect(fixed).to.equal(code)
        done()
      })
    })

    it('should not modify already quoted text', function (done) {
      var code = '@startuml\nA -> B: "already quoted"\n@enduml'
      plantuml.fixSyntax(code, function (err, fixed, wasFixed) {
        expect(err).to.equal(null)
        expect(wasFixed).to.equal(false)
        expect(fixed).to.equal(code)
        done()
      })
    })

    it('should work with options', function (done) {
      var code = '@startuml\nA -> B: Hello\n@enduml'
      plantuml.fixSyntax(code, { warnOnFix: false }, function (err, fixed, wasFixed) {
        expect(err).to.equal(null)
        expect(wasFixed).to.equal(false)
        expect(fixed).to.equal(code)
        done()
      })
    })

    it('should handle callback as second parameter', function (done) {
      var code = '@startuml\nA -> B: Hello\n@enduml'
      plantuml.fixSyntax(code, function (err, fixed, wasFixed) {
        expect(err).to.equal(null)
        expect(wasFixed).to.equal(false)
        expect(fixed).to.equal(code)
        done()
      })
    })
  })
})
