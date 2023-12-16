import { Command } from "commander"
import buyChipsCli from './cli/slots/buyChips'
import deployCli from './cli/slots/deploy'
import cashChipsCli from './cli/slots/cashChips'
import initMachineCli from './cli/slots/initMachine'
import playCli from './cli/slots/play'

/** // TODO:
 * add a CLI to interact with contracts:
 * - [x] deploy
 * - [ ] vanity cli frame:
 *   - [ ] show deployed addresses
 *   - [ ] show chips balance
 * - [x] save addresses to a file
 * - [ ] init slot machines, show available machines & stats
 * - [x] buy chips
 * - [ ] play slots
 * - [x] cash out
 */
const suappsCli = new Command()
  .name('suapp')
  .description('Demo SUAPPs!')

suappsCli
  .command('slots')
  .description('Play slots on SUAVE.')
  .addCommand(deployCli())
  .addCommand(buyChipsCli())
  .addCommand(cashChipsCli())
  .addCommand(initMachineCli())
  .addCommand(playCli())

suappsCli.parse(process.argv)
