/*
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the 'License').
 * You may not use this file except in compliance with the License.
 * A copy of the License is located at
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * or in the 'license' file accompanying this file. This file is distributed
 * on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 * express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import { suite, test } from 'mocha';
import {
    MultiValueListControl,
    MultiValueListStateValue,
    MultiValueValidationResult,
} from '../../src/commonControls/MultiValueListControl/MultiValueListControl';
import { Strings as $ } from '../../src/constants/Strings';
import { Control } from '../../src/controls/Control';
import { ControlManager } from '../../src/controls/ControlManager';
import { AmazonIntent } from '../../src/intents/AmazonBuiltInIntent';
import { MultiValueControlIntent } from '../../src/intents/MultiValueControlIntent';
import { ControlHandler } from '../../src/runtime/ControlHandler';
import { IntentBuilder } from '../../src/utils/IntentUtils';
import { testE2E, TestInput, waitForDebugger } from '../../src/utils/testSupport/TestingUtils';

waitForDebugger();

suite('MultiValueListControl e2e tests', () => {
    class CategorySuiteManager extends ControlManager {
        createControlTree(): Control {
            const categoryControl = new MultiValueListControl({
                id: 'apple',
                validation: validateProducts,
                listItemIDs: getProductList,
                slotType: 'AppleSuite',
                confirmationRequired: true,
                prompts: {
                    confirmValue: 'Is that all?',
                },
            });

            function getProductList() {
                return ['AirPods', 'iWatch', 'iPhone', 'iPad', 'MacBook'];
            }

            function validateProducts(values: MultiValueListStateValue[]): true | MultiValueValidationResult {
                const invalidValues = [];
                for (const product of values) {
                    if (getProductList().includes(product.id) !== true) {
                        invalidValues.push(product.id);
                    }
                }
                if (invalidValues.length > 0) {
                    return {
                        invalidValues,
                        renderedReason: 'item is not available in the product list',
                    };
                }
                return true;
            }

            return categoryControl;
        }
    }

    suite('CategorySuiteManager e2e tests', () => {
        test('Add multiple items with an invalid value', async () => {
            const requestHandler = new ControlHandler(new CategorySuiteManager());
            await testE2E(requestHandler, [
                'U: add iPhone and iPac',
                TestInput.of(
                    MultiValueControlIntent.of('AppleSuite', {
                        AppleSuite: ['iPhone', 'iPac'],
                        action: $.Action.Add,
                    }),
                ),
                "A: OK, added iPhone. Sorry, iPac can't be added as item is not available in the product list. Is that all?",
                'U: Yeah.',
                TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
                'A: Great.',
            ]);
        });

        test('Add multiple items invalid values, elicit a value for control', async () => {
            const requestHandler = new ControlHandler(new CategorySuiteManager());
            await testE2E(requestHandler, [
                'U: add iPod and iPac',
                TestInput.of(
                    MultiValueControlIntent.of('AppleSuite', {
                        AppleSuite: ['iPod', 'iPac'],
                        action: $.Action.Add,
                    }),
                ),
                "A:  Sorry, iPod and iPac can't be added as item is not available in the product list. What is your selection? Some suggestions are AirPods, iWatch or iPhone.",
            ]);
        });

        test('Bare values support', async () => {
            const requestHandler = new ControlHandler(new CategorySuiteManager());
            await testE2E(requestHandler, [
                'U: add iPhone and iPac',
                TestInput.of(
                    MultiValueControlIntent.of('AppleSuite', {
                        AppleSuite: ['iPhone', 'iPac'],
                        action: $.Action.Add,
                    }),
                ),
                "A: OK, added iPhone. Sorry, iPac can't be added as item is not available in the product list. Is that all?",
                'U: iPad',
                TestInput.of(MultiValueControlIntent.of('AppleSuite', { AppleSuite: 'iPad' })),
                'A: OK, added iPad. Is that all?',
                'U: Yeah.',
                TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
                'A: Great.',
            ]);
        });

        test('Negative prompts and removal of items', async () => {
            const requestHandler = new ControlHandler(new CategorySuiteManager());
            await testE2E(requestHandler, [
                'U: add iPhone and AirPods',
                TestInput.of(
                    MultiValueControlIntent.of('AppleSuite', {
                        AppleSuite: ['iPhone', 'AirPods'],
                        action: $.Action.Add,
                    }),
                ),
                'A: OK, added iPhone and AirPods. Is that all?',
                'U: No',
                TestInput.of(IntentBuilder.of(AmazonIntent.NoIntent)),
                'A: You can add or update more values',
                'U: remove iPods',
                TestInput.of(
                    MultiValueControlIntent.of('AppleSuite', {
                        AppleSuite: 'iPods',
                        action: $.Action.Remove,
                    }),
                ),
                "A: Sorry, iPods can't be added it doesn't exist. What value do you want to remove? Some suggestions are iPhone or AirPods.",
                'U: remove AirPods',
                TestInput.of(
                    MultiValueControlIntent.of('AppleSuite', {
                        AppleSuite: 'AirPods',
                        action: $.Action.Remove,
                    }),
                ),
                'A: OK, removed AirPods. Is that all?',
                'U: Yes',
                TestInput.of(IntentBuilder.of(AmazonIntent.YesIntent)),
                'A: Great.',
            ]);
        });
    });
});
