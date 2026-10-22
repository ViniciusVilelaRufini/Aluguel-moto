import { Logger } from '@nestjs/common';
import type { StaffDirectory, StaffIdentity } from '../../ports/staff-directory.port';
import type { StaffGroup } from '../../common/enums';

/** `AUTH_MODE=dev`: não há pool; o cadastro local já é a fonte da autorização. Só registra (sem e-mail no log). */
export class LocalStaffDirectory implements StaffDirectory {
  private readonly logger = new Logger('LocalStaffDirectory');

  async updateGroups(_user: StaffIdentity, change: { add: StaffGroup[]; remove: StaffGroup[] }): Promise<void> {
    this.logger.log({ msg: 'staff_directory_groups_noop', add: change.add, remove: change.remove });
  }

  async setActive(_user: StaffIdentity, active: boolean): Promise<void> {
    this.logger.log({ msg: 'staff_directory_active_noop', active });
  }
}
