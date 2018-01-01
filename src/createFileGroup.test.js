import { createFileSuite } from "./createFileSuite.js"
import { test as createTest } from "./createTest.js"
import { test } from "@dmail/test-cheap"
import { createSpy } from "@dmail/spy"
import assert from "assert"
import { install } from "lolex"

test("createPackageTest.js", ({ ensure }) => {
	ensure("calls before/afterEachFile, before/afterEachTest", () => {
		const firstValue = 1
		const secondValue = 2
		const thirdValue = 3
		const firstFile = "file-1"
		const secondFile = "file-2"
		const firstDesc = "desc-1"
		const secondDesc = "desc-2"
		const thirdDesc = "desc-3"
		const tests = [
			createTest({
				[firstDesc]: ({ fail }) => fail(firstValue),
				[secondDesc]: ({ pass }) => pass(secondValue),
			}),
			createTest({
				[thirdDesc]: ({ pass }) => pass(thirdValue),
			}),
		]
		const { run } = createFileSuite({
			files: [firstFile, secondFile],
			getFileTest: (name, index) => tests[index],
		})

		const beforeEachFile = createSpy("beforeEachFile")
		const afterEachFile = createSpy("afterEachFile")
		const beforeEachTest = createSpy("beforeEachTest")
		const afterEachTest = createSpy("afterEachTest")

		run({
			beforeEachFile,
			afterEachFile,
			beforeEachTest,
			afterEachTest,
		})

		const beforeEachFileFirstCall = beforeEachFile.track(0)
		const beforeEachFileSecondCall = beforeEachFile.track(1)
		const afterEachFileFirstCall = afterEachFile.track(0)
		const afterEachFileSecondCall = afterEachFile.track(1)
		const beforeEachTestFirstCall = beforeEachTest.track(0)
		const beforeEachTestSecondCall = beforeEachTest.track(1)
		const beforeEachTestThirdCall = beforeEachTest.track(2)
		const afterEachTestFirstCall = afterEachTest.track(0)
		const afterEachTestSecondCall = afterEachTest.track(1)
		const afterEachTestThirdCall = afterEachTest.track(2)

		const assertCalledInOrder = (...trackers) => {
			trackers.reduce((previousTracker, tracker) => {
				const report = tracker.createReport()
				assert(report.called, `${tracker} not called`)
				assert(
					previousTracker.createReport().absoluteOrder < report.absoluteOrder,
					`${tracker} must be called before ${previousTracker}`,
				)
				return tracker
			})
		}
		const assertArgValues = (tracker, ...expectedValues) => {
			assert.deepEqual(tracker.createReport().argValues, expectedValues)
		}

		assertCalledInOrder(
			beforeEachFileFirstCall,
			beforeEachTestFirstCall,
			afterEachTestFirstCall,
			beforeEachTestSecondCall,
			afterEachTestSecondCall,
			afterEachFileFirstCall,
			beforeEachFileSecondCall,
			beforeEachTestThirdCall,
			afterEachTestThirdCall,
			afterEachFileSecondCall,
		)

		assertArgValues(beforeEachFileFirstCall, firstFile)
		assertArgValues(beforeEachTestFirstCall, firstFile, firstDesc)
		assertArgValues(afterEachTestFirstCall, firstFile, firstDesc, firstValue, false)
		assertArgValues(beforeEachTestSecondCall, firstFile, secondDesc)
		assertArgValues(afterEachTestSecondCall, firstFile, secondDesc, secondValue, true)
		assertArgValues(
			afterEachFileFirstCall,
			firstFile,
			[{ state: "failed", result: firstValue }, { state: "passed", result: secondValue }],
			false,
		)
		assertArgValues(beforeEachFileSecondCall, secondFile)
		assertArgValues(beforeEachTestThirdCall, secondFile, thirdDesc)
		assertArgValues(afterEachTestThirdCall, secondFile, thirdDesc, thirdValue, true)
		assertArgValues(
			afterEachFileSecondCall,
			secondFile,
			[{ state: "passed", result: thirdValue }],
			true,
		)
	})

	ensure("each test is given appropriate allocatedMs", () => {
		const clock = install()

		const firstTestSpy = createSpy()
		const secondTestSpy = createSpy()
		const tests = [createTest("a", firstTestSpy), createTest("b", secondTestSpy)]
		const { run } = createFileSuite({
			files: ["a", "b"],
			getFileSuite: (name, index) => tests[index],
		})

		run({
			allocatedMs: 100,
		})

		const firstCall = firstTestSpy.track(0)
		const firstAction = firstCall.createReport().argValues[0]

		assert.equal(firstAction.getRemainingMs(), 100)
		clock.tick(10)
		firstAction.pass()

		const secondCall = secondTestSpy.track(0)
		const secondAction = secondCall.createReport().argValues[0]

		assert.equal(secondAction.getRemainingMs(), 90)

		clock.uninstall()
	})

	ensure("when an expectation runs out of ms, all test fails", () => {
		const clock = install()
		const firstTestSpy = createSpy()
		const secondTestSpy = createSpy()
		const tests = [createTest("a", firstTestSpy), createTest("b", secondTestSpy)]
		const { run } = createFileSuite({
			files: ["a", "b"],
			getFileTest: (name, index) => tests[index],
		})

		const action = run({
			allocatedMs: 100,
		})

		clock.tick(100)
		assert.equal(action.getState(), "failed")
		assert.equal(action.getResult(), "must pass or fail in less than 100ms")
		assert.equal(secondTestSpy.track(0).createReport().called, false)

		clock.uninstall()
	})
})
