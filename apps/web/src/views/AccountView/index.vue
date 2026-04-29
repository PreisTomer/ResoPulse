<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="account">

    <div class="account__bg" aria-hidden="true">
      <div class="account__bg-grid"></div>
    </div>

    <div class="account__layout">

      <!-- Page header -->
      <div class="account__header">
        <RouterLink :to="ROUTE.HOME" class="account__back">
          <span>{{ ICON.ARROW_SHORT }}</span> {{ $t('account.back') }}
        </RouterLink>
        <h1 class="account__title">{{ $t('account.title') }}</h1>
      </div>

      <div class="account__body">

        <!-- Sidebar nav -->
        <nav class="account__sidebar">
          <button
            v-for="sec in sections"
            :key="sec.id"
            class="account__nav-item"
            :class="{ 'account__nav-item--active': activeSection === sec.id, 'account__nav-item--danger': sec.id === 'danger' }"
            @click="activeSection = sec.id as 'profile' | 'workspace' | 'security' | 'danger'"
          >
            <span class="account__nav-icon">{{ sec.icon }}</span>
            <span>{{ sec.label }}</span>
          </button>
        </nav>

        <!-- Content -->
        <div class="account__content">

          <!-- ── Profile ─────────────────────────────────────────── -->
          <section v-if="activeSection === 'profile'" class="account__section">
            <div class="account__section-header">
              <h2 class="account__section-title">{{ $t('account.profileSection') }}</h2>
            </div>

            <!-- Avatar -->
            <div class="account__card">
              <div class="account__row">
                <div class="account__avatar-wrap">
                  <img v-if="userImageUrl" :src="userImageUrl" class="account__avatar" alt="Profile photo" />
                  <span v-else class="account__avatar-initials">{{ userInitials }}</span>
                  <button class="account__avatar-btn" @click="triggerAvatarUpload">
                    {{ ICON.RELOAD }}
                  </button>
                </div>
                <div class="account__avatar-info">
                  <span class="account__label">{{ $t('account.profileAvatar') }}</span>
                  <span class="account__muted">{{ $t('account.profileAvatarHint') }}</span>
                  <button class="account__link-btn" @click="triggerAvatarUpload">{{ $t('account.profileChangePhoto') }}</button>
                </div>
                <input ref="avatarInput" type="file" accept="image/jpeg,image/png,image/webp" class="account__hidden-input" @change="onAvatarChange" />
              </div>
            </div>

            <!-- Name -->
            <div class="account__card">
              <span class="account__label">{{ $t('account.profileName') }}</span>
              <div class="account__field-row">
                <input
                  v-model="nameFirst"
                  type="text"
                  class="account__input"
                  :placeholder="$t('account.profileFirstName')"
                  @input="profileDirty = true"
                />
                <input
                  v-model="nameLast"
                  type="text"
                  class="account__input"
                  :placeholder="$t('account.profileLastName')"
                  @input="profileDirty = true"
                />
              </div>
              <div class="account__field-row account__field-row--actions">
                <button
                  class="account__btn account__btn--primary"
                  :disabled="!profileDirty || profileSaving"
                  @click="saveProfile"
                >
                  <span v-if="profileSaved" class="account__btn-check">{{ ICON.CHECK }}</span>
                  {{ profileSaving ? $t('account.profileSaving') : profileSaved ? $t('account.profileSaved') : $t('account.profileSave') }}
                </button>
                <span v-if="profileError" class="account__error">{{ profileError }}</span>
              </div>
            </div>

            <!-- Email -->
            <div class="account__card">
              <span class="account__label">{{ $t('account.profileEmail') }}</span>
              <span class="account__value">{{ primaryEmail }}</span>
              <span class="account__muted">{{ $t('account.profileEmailNote') }}</span>
            </div>

            <!-- Connected accounts -->
            <div v-if="connectedAccounts.length" class="account__card">
              <span class="account__label">{{ $t('account.profileConnected') }}</span>
              <div v-for="acc in connectedAccounts" :key="acc.id" class="account__connected-item">
                <span class="account__connected-provider">{{ acc.provider }}</span>
                <span class="account__connected-email">{{ acc.emailAddress }}</span>
                <span class="account__badge account__badge--ok">{{ ICON.CHECK }} {{ $t('account.connectedStatus') }}</span>
              </div>
            </div>
          </section>

          <!-- ── Workspace ───────────────────────────────────────── -->
          <section v-if="activeSection === 'workspace'" class="account__section">
            <div class="account__section-header">
              <h2 class="account__section-title">{{ $t('account.workspaceSection') }}</h2>
            </div>

            <!-- Org info -->
            <div class="account__card">
              <div class="account__kv-row">
                <span class="account__label">{{ $t('account.workspaceName') }}</span>
                <span class="account__value">{{ orgName }}</span>
              </div>
              <div v-if="orgSlug" class="account__kv-row">
                <span class="account__label">{{ $t('account.workspaceSlug') }}</span>
                <span class="account__value account__value--mono">{{ orgSlug }}</span>
              </div>
              <div class="account__kv-row">
                <span class="account__label">{{ $t('account.yourRole') }}</span>
                <span class="account__badge" :class="roleClass">{{ myRoleLabel }}</span>
              </div>
            </div>

            <!-- Members -->
            <div class="account__card">
              <span class="account__label">{{ $t('account.workspaceMembers') }}</span>
              <div v-if="membersLoading" class="account__loading">{{ $t('account.membersLoading') }}</div>
              <div v-else-if="!members.length" class="account__muted">{{ $t('account.workspaceNoMembers') }}</div>
              <div v-else class="account__members-list">
                <div v-for="m in members" :key="m.membershipId" class="account__member-row">
                  <div class="account__member-avatar-wrap">
                    <img v-if="m.imageUrl" :src="m.imageUrl" class="account__member-avatar" :alt="m.fullName" />
                    <span v-else class="account__member-initials">{{ m.initials }}</span>
                  </div>
                  <div class="account__member-info">
                    <span class="account__member-name">{{ m.fullName || m.identifier }}</span>
                    <span class="account__member-email">{{ m.identifier }}</span>
                  </div>
                  <span class="account__badge" :class="memberRoleClass(m.role)">{{ memberRoleLabel(m.role) }}</span>
                  <button
                    v-if="canRemoveMember(m)"
                    class="account__icon-btn account__icon-btn--danger"
                    :title="$t('account.workspaceRemove')"
                    @click="removeMember(m)"
                  >{{ ICON.CLOSE }}</button>
                </div>
              </div>
            </div>

            <!-- Invite -->
            <div v-if="isOwnerOrAdmin" class="account__card">
              <span class="account__label">{{ $t('account.workspaceInvite') }}</span>
              <div class="account__field-row">
                <input
                  v-model="inviteEmail"
                  type="email"
                  class="account__input"
                  :placeholder="$t('account.workspaceInviteEmail')"
                />
                <select v-model="inviteRole" class="account__select">
                  <option value="org:member">{{ $t('account.workspaceRoleMember') }}</option>
                  <option value="org:admin">{{ $t('account.workspaceRoleAdmin') }}</option>
                </select>
              </div>
              <div class="account__field-row account__field-row--actions">
                <button
                  class="account__btn account__btn--primary"
                  :disabled="!inviteEmail || inviteSending"
                  @click="sendInvite"
                >
                  {{ inviteSending ? $t('account.workspaceInviting') : $t('account.workspaceInviteBtn') }}
                </button>
                <span v-if="inviteSuccess" class="account__ok">{{ $t('account.inviteSuccess') }}</span>
                <span v-if="inviteError" class="account__error">{{ inviteError }}</span>
              </div>
            </div>

            <!-- Pending invitations -->
            <div v-if="pendingInvites.length" class="account__card">
              <span class="account__label">{{ $t('account.workspacePendingInvites') }}</span>
              <div v-for="inv in pendingInvites" :key="inv.id" class="account__member-row">
                <span class="account__member-email">{{ inv.emailAddress }}</span>
                <span class="account__badge account__badge--dim">{{ memberRoleLabel(inv.role) }}</span>
                <span class="account__badge account__badge--warn">{{ $t('account.pendingBadge') }}</span>
              </div>
            </div>

            <!-- Leave org -->
            <div v-if="!isOwner" class="account__card account__card--warn">
              <span class="account__label">{{ $t('account.workspaceLeave') }}</span>
              <p class="account__muted">{{ $t('account.workspaceLeaveDesc') }}</p>
              <button class="account__btn account__btn--danger" @click="leaveOrg">
                {{ $t('account.workspaceLeave') }}
              </button>
            </div>
          </section>

          <!-- ── Security ────────────────────────────────────────── -->
          <section v-if="activeSection === 'security'" class="account__section">
            <div class="account__section-header">
              <h2 class="account__section-title">{{ $t('account.securitySection') }}</h2>
            </div>

            <div class="account__card">
              <div class="account__section-row">
                <span class="account__label">{{ $t('account.securitySessions') }}</span>
                <button
                  v-if="otherSessions.length"
                  class="account__link-btn account__link-btn--danger"
                  :disabled="revokingAll"
                  @click="revokeAllOther"
                >{{ $t('account.securityRevokeAll') }}</button>
              </div>

              <div v-if="sessionsLoading" class="account__loading">{{ $t('account.sessionsLoading') }}</div>
              <div v-else-if="!sessions.length" class="account__muted">{{ $t('account.securityNoSessions') }}</div>
              <div v-else class="account__sessions-list">
                <div v-for="s in sessions" :key="s.id" class="account__session-row">
                  <div class="account__session-info">
                    <span class="account__session-device">{{ s.deviceLabel }}</span>
                    <span class="account__session-last">{{ $t('account.securityLastActive') }}: {{ s.lastActiveFormatted }}</span>
                  </div>
                  <span v-if="s.isCurrent" class="account__badge account__badge--ok">{{ $t('account.securityThisSession') }}</span>
                  <button
                    v-else
                    class="account__btn account__btn--ghost"
                    :disabled="s.revoking"
                    @click="revokeSession(s)"
                  >{{ $t('account.securityRevoke') }}</button>
                </div>
              </div>
            </div>
          </section>

          <!-- ── Danger Zone ─────────────────────────────────────── -->
          <section v-if="activeSection === 'danger'" class="account__section">
            <div class="account__section-header">
              <h2 class="account__section-title account__section-title--danger">{{ $t('account.dangerSection') }}</h2>
            </div>

            <div class="account__card account__card--danger">
              <span class="account__label">{{ deleteContextTitle }}</span>
              <p class="account__muted">{{ deleteContextDesc }}</p>

              <div v-if="canDeleteAccount" class="account__field-col">
                <label class="account__label" for="delete-confirm">{{ $t('account.dangerDeleteConfirmLabel') }}</label>
                <input
                  id="delete-confirm"
                  v-model="deleteConfirmText"
                  type="text"
                  class="account__input account__input--danger"
                  :placeholder="$t('account.dangerDeleteConfirmPlaceholder')"
                />
              </div>
              <button
                v-if="canDeleteAccount"
                class="account__btn account__btn--danger-solid"
                :disabled="deleteConfirmText !== 'DELETE' || deleting"
                @click="deleteAccount"
              >
                {{ deleting ? $t('account.dangerDeleting') : $t('account.dangerDeleteBtn') }}
              </button>
              <p v-else class="account__muted account__muted--warn">{{ $t('account.dangerDeleteNotAllowed') }}</p>

              <span v-if="deleteError" class="account__error">{{ deleteError }}</span>
            </div>
          </section>

        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue'
import { useUser, useOrganization, useClerk } from '@clerk/vue'
import type {
  OrganizationMembershipResource,
  OrganizationInvitationResource,
  InviteMemberParams,
  GetMembersParams,
  GetInvitationsParams,
  ClerkPaginatedResponse,
  SessionWithActivitiesResource,
} from '@clerk/shared/types'

import { ROUTE } from '@/constants/routes'

import { ICON } from '@/constants/icons'

interface OrgMember {
  membershipId: string
  userId:       string
  fullName:     string
  initials:     string
  identifier:   string
  imageUrl:     string
  role:         string
  revoking?:    boolean
}

interface PendingInvite {
  id:           string
  emailAddress: string
  role:         string
}

interface SessionInfo {
  id:                 string
  isCurrent:          boolean
  deviceLabel:        string
  lastActiveFormatted: string
  revoking:           boolean
}

type ClerkOrgApi = {
  getMemberships(opts?: GetMembersParams): Promise<ClerkPaginatedResponse<OrganizationMembershipResource>>
  getInvitations(opts?: GetInvitationsParams): Promise<ClerkPaginatedResponse<OrganizationInvitationResource>>
  inviteMember(opts: InviteMemberParams): Promise<OrganizationInvitationResource>
  removeMember(userId: string): Promise<OrganizationMembershipResource>
}

export default defineComponent({
  name: 'AccountView',

  setup() {
    const { user }                           = useUser()
    const { organization, membership }       = useOrganization()
    const clerk                              = useClerk()
    const avatarInput                        = ref<HTMLInputElement | null>(null)
    return { clerkUser: user, organization, membership, clerk, avatarInput }
  },

  data() {
    return {
      activeSection: 'profile' as 'profile' | 'workspace' | 'security' | 'danger',

      // Profile
      nameFirst:    '',
      nameLast:     '',
      profileDirty: false,
      profileSaving: false,
      profileSaved:  false,
      profileError:  '',

      // Workspace — members
      members:        [] as OrgMember[],
      membersLoading: false,
      pendingInvites: [] as PendingInvite[],

      // Workspace — invite
      inviteEmail:   '',
      inviteRole:    'org:member',
      inviteSending: false,
      inviteSuccess: false,
      inviteError:   '',

      // Security — sessions
      sessions:       [] as SessionInfo[],
      sessionsLoading: false,
      revokingAll:    false,

      // Danger
      deleteConfirmText: '',
      deleting:          false,
      deleteError:       '',
    }
  },

  computed: {
    ROUTE()  { return ROUTE },
    ICON()   { return ICON },

    sections() {
      return [
        { id: 'profile',   icon: ICON.USER,    label: this.$t('account.navProfile')   },
        { id: 'workspace', icon: ICON.ORG,     label: this.$t('account.navWorkspace') },
        { id: 'security',  icon: ICON.LOCK,    label: this.$t('account.navSecurity')  },
        { id: 'danger',    icon: ICON.WARNING, label: this.$t('account.navDanger')    },
      ]
    },

    userImageUrl(): string {
      return this.clerkUser?.imageUrl ?? ''
    },

    userInitials(): string {
      const u = this.clerkUser
      if (!u) return '?'
      return ((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase() || '?'
    },

    primaryEmail(): string {
      return this.clerkUser?.primaryEmailAddress?.emailAddress ?? ''
    },

    connectedAccounts(): { id: string; provider: string; emailAddress: string }[] {
      return (this.clerkUser?.externalAccounts ?? []).map(a => ({
        id:           a.id,
        provider:     a.provider.charAt(0).toUpperCase() + a.provider.slice(1),
        emailAddress: a.emailAddress ?? '',
      }))
    },

    orgName(): string {
      return (this.organization as { name?: string } | null)?.name ?? ''
    },

    orgSlug(): string {
      return (this.organization as { slug?: string } | null)?.slug ?? ''
    },

    currentUserId(): string {
      return this.clerkUser?.id ?? ''
    },

    myRole(): string {
      return (this.membership as { role?: string } | null)?.role ?? ''
    },

    isOwner(): boolean {
      return this.myRole === 'org:owner'
    },

    isOwnerOrAdmin(): boolean {
      return this.isOwner || this.myRole === 'org:admin'
    },

    myRoleLabel(): string {
      return this.memberRoleLabel(this.myRole)
    },

    roleClass(): string {
      if (this.isOwner)                   return 'account__badge--primary'
      if (this.myRole === 'org:admin')    return 'account__badge--primary'
      return 'account__badge--dim'
    },

    canDeleteAccount(): boolean {
      // Clerk sets deleteSelfEnabled on the user object when the instance permits self-deletion.
      return (this.clerkUser as { deleteSelfEnabled?: boolean } | null)?.deleteSelfEnabled === true
    },

    orgMembersCount(): number {
      return (this.organization as { membersCount?: number } | null)?.membersCount ?? 0
    },

    isSoleOrgMember(): boolean {
      return this.isOwnerOrAdmin && this.orgMembersCount === 1
    },

    isSoleAdminMultiMember(): boolean {
      return this.isOwnerOrAdmin && this.orgMembersCount > 1
    },

    deleteContextDesc(): string {
      if (this.isSoleOrgMember) {
        return this.$t('account.dangerDeleteDescSoleOrgMember', { org: this.orgName })
      }
      if (this.isSoleAdminMultiMember) {
        return this.$t('account.dangerDeleteDescOrgAdmin', { org: this.orgName })
      }
      return this.$t('account.dangerDeleteDesc')
    },

    deleteContextTitle(): string {
      if (this.isSoleOrgMember)        return this.$t('account.dangerDeleteTitleSoleOrgMember')
      if (this.isSoleAdminMultiMember) return this.$t('account.dangerDeleteTitleOrgAdmin')
      return this.$t('account.dangerDeleteTitle')
    },

    otherSessions(): SessionInfo[] {
      return this.sessions.filter(s => !s.isCurrent)
    },
  },

  watch: {
    activeSection(section: string) {
      if (section === 'workspace') this.loadMembers()
      if (section === 'security')  this.loadSessions()
    },

    clerkUser: {
      immediate: true,
      handler(u) {
        if (!u) return
        this.nameFirst = u.firstName ?? ''
        this.nameLast  = u.lastName  ?? ''
      },
    },
  },

  methods: {
    memberRoleLabel(role: string): string {
      if (role === 'org:owner') return this.$t('account.workspaceRoleOwner')
      if (role === 'org:admin') return this.$t('account.workspaceRoleAdmin')
      return this.$t('account.workspaceRoleMember')
    },

    memberRoleClass(role: string): string {
      if (role === 'org:owner' || role === 'org:admin') return 'account__badge--primary'
      return 'account__badge--dim'
    },

    canRemoveMember(member: OrgMember): boolean {
      return this.isOwnerOrAdmin && member.userId !== this.currentUserId
    },

    triggerAvatarUpload(): void {
      this.avatarInput?.click()
    },

    async onAvatarChange(e: Event): Promise<void> {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file || !this.clerkUser) return
      try {
        await this.clerkUser.setProfileImage({ file })
      } catch (err) {
        this.profileError = (err as { errors?: { message: string }[] })?.errors?.[0]?.message ?? 'Failed to upload photo.'
      }
    },

    async saveProfile(): Promise<void> {
      if (!this.clerkUser || !this.profileDirty) return
      this.profileSaving = true
      this.profileError  = ''
      this.profileSaved  = false
      try {
        await this.clerkUser.update({ firstName: this.nameFirst, lastName: this.nameLast })
        this.profileDirty = false
        this.profileSaved = true
        setTimeout(() => { this.profileSaved = false }, 2500)
      } catch (err) {
        this.profileError = (err as { errors?: { message: string }[] })?.errors?.[0]?.message ?? 'Failed to save profile.'
      } finally {
        this.profileSaving = false
      }
    },

    async loadMembers(): Promise<void> {
      if (!this.organization) return
      this.membersLoading = true
      try {
        const org = this.organization as ClerkOrgApi
        const { data } = await org.getMemberships({ pageSize: 50 })
        this.members = data.map((m) => {
          const ud   = m.publicUserData
          const full = [ud?.firstName, ud?.lastName].filter(Boolean).join(' ')
          const init = ((ud?.firstName?.[0] ?? '') + (ud?.lastName?.[0] ?? '')).toUpperCase() || '?'
          return {
            membershipId: m.id,
            userId:       ud?.userId ?? '',
            fullName:     full,
            initials:     init,
            identifier:   ud?.identifier ?? '',
            imageUrl:     ud?.imageUrl ?? '',
            role:         m.role,
          }
        })

        const { data: invites } = await org.getInvitations({ pageSize: 20 })
        this.pendingInvites = invites.map((i) => ({
          id:           i.id,
          emailAddress: i.emailAddress,
          role:         i.role,
        }))
      } catch {
        // Non-fatal — leave members list empty
      } finally {
        this.membersLoading = false
      }
    },

    async sendInvite(): Promise<void> {
      if (!this.inviteEmail || !this.organization) return
      this.inviteSending = true
      this.inviteError   = ''
      this.inviteSuccess = false
      try {
        const org = this.organization as ClerkOrgApi
        await org.inviteMember({ emailAddress: this.inviteEmail, role: this.inviteRole })
        this.inviteEmail   = ''
        this.inviteSuccess = true
        setTimeout(() => { this.inviteSuccess = false }, 3000)
        await this.loadMembers()
      } catch (err) {
        this.inviteError = (err as { errors?: { message: string }[] })?.errors?.[0]?.message ?? 'Failed to send invitation.'
      } finally {
        this.inviteSending = false
      }
    },

    async removeMember(member: OrgMember): Promise<void> {
      if (!this.organization) return
      try {
        const org = this.organization as ClerkOrgApi
        await org.removeMember(member.userId)
        await this.loadMembers()
      } catch (err) {
        console.error('Failed to remove member:', err)
      }
    },

    async leaveOrg(): Promise<void> {
      if (!this.organization || !this.clerkUser) return
      try {
        const org = this.organization as ClerkOrgApi
        await org.removeMember(this.clerkUser.id)
        this.$router.push(ROUTE.ONBOARDING)
      } catch (err) {
        console.error('Failed to leave workspace:', err)
      }
    },

    async loadSessions(): Promise<void> {
      if (!this.clerkUser) return
      this.sessionsLoading = true
      try {
        const user    = this.clerkUser as { getSessions(): Promise<SessionWithActivitiesResource[]> }
        const raw     = await user.getSessions()
        const current = (this.clerk as { session?: { id?: string } })?.session?.id ?? ''
        this.sessions = raw
          .filter((s) => s.status === 'active')
          .map((s) => {
            const last   = new Date(s.lastActiveAt)
            const device = s.latestActivity?.browserName ?? s.latestActivity?.deviceType ?? 'Unknown device'
            return {
              id:                  s.id,
              isCurrent:           s.id === current,
              deviceLabel:         device,
              lastActiveFormatted: last.toLocaleString(),
              revoking:            false,
            }
          })
          .sort((a, b) => (a.isCurrent ? -1 : b.isCurrent ? 1 : 0))
      } catch {
        // Non-fatal
      } finally {
        this.sessionsLoading = false
      }
    },

    async revokeSession(session: SessionInfo): Promise<void> {
      session.revoking = true
      try {
        const raw = await (this.clerkUser as { getSessions(): Promise<object[]> }).getSessions()
        const match = raw.find((s) => (s as { id: string }).id === session.id) as { revoke(): Promise<void> } | undefined
        await match?.revoke()
        this.sessions = this.sessions.filter(s => s.id !== session.id)
      } catch (err) {
        session.revoking = false
        console.error('Failed to revoke session:', err)
      }
    },

    async revokeAllOther(): Promise<void> {
      this.revokingAll = true
      try {
        const raw = await (this.clerkUser as { getSessions(): Promise<object[]> }).getSessions()
        const current = (this.clerk as { session?: { id?: string } })?.session?.id ?? ''
        for (const s of raw) {
          const sess = s as { id: string; status: string; revoke(): Promise<void> }
          if (sess.id !== current && sess.status === 'active') {
            await sess.revoke()
          }
        }
        await this.loadSessions()
      } catch (err) {
        console.error('Failed to revoke sessions:', err)
      } finally {
        this.revokingAll = false
      }
    },

    async deleteAccount(): Promise<void> {
      if (this.deleteConfirmText !== 'DELETE' || !this.clerkUser) return
      this.deleting    = true
      this.deleteError = ''
      try {
        type OrgResource        = { membersCount: number; destroy(): Promise<unknown> }
        type MembershipResource = { role: string; destroy(): Promise<unknown>; organization: OrgResource }
        type DeletableUser      = { delete(): Promise<void>; organizationMemberships: MembershipResource[] }

        const user = this.clerkUser as object as DeletableUser

        for (const membership of user.organizationMemberships) {
          if (membership.role !== 'org:admin') continue

          if (membership.organization.membersCount === 1) {
            // Sole member — safe to destroy the entire org.
            await membership.organization.destroy()
          } else {
            // Other members exist — leave the org. Clerk will reject this if no
            // other admin exists; the caught error will surface to the user.
            await membership.destroy()
          }
        }

        await user.delete()
        this.$router.push(ROUTE.SIGN_IN)
      } catch (err) {
        const clerkMsg = (err as { errors?: { message: string }[] })?.errors?.[0]?.message
        this.deleteError = clerkMsg ?? this.$t('account.dangerDeleteFailed')
        this.deleting = false
      }
    },
  },
})
</script>

<style lang="scss" scoped>
.account {
  min-height: 100vh;
  position: relative;

  /* ── Background ──────────────────────────────────────────────────── */
  &__bg {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 0;

    &-grid {
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(color-mix(in srgb, var(--color-primary) 3%, transparent) 1px, transparent 1px),
        linear-gradient(90deg, color-mix(in srgb, var(--color-primary) 3%, transparent) 1px, transparent 1px);
      background-size: 52px 52px;
      mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, black 20%, transparent 100%);
    }
  }

  /* ── Layout ──────────────────────────────────────────────────────── */
  &__layout {
    position: relative;
    z-index: 1;
    max-width: 1060px;
    margin: 0 auto;
    padding: 2rem 2rem 4rem;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  /* ── Header ──────────────────────────────────────────────────────── */
  &__header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__back {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
    text-decoration: none;
    opacity: var(--op-muted);
    transition: opacity var(--tr-fast), color var(--tr-fast);

    &:hover { opacity: 1; color: var(--color-primary); }
  }

  &__title {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-text-heading);
    letter-spacing: -0.01em;
  }

  /* ── Body ────────────────────────────────────────────────────────── */
  &__body {
    display: flex;
    gap: 2rem;
    align-items: flex-start;

    @media (max-width: 768px) {
      flex-direction: column;
    }
  }

  /* ── Sidebar ─────────────────────────────────────────────────────── */
  &__sidebar {
    flex-shrink: 0;
    width: 180px;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    position: sticky;
    top: calc(var(--navbar-height, 56px) + 1.5rem);

    @media (max-width: 768px) {
      width: 100%;
      flex-direction: row;
      flex-wrap: wrap;
      position: static;
    }
  }

  &__nav-item {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.55rem 0.75rem;
    border-radius: var(--radius);
    border: none;
    background: transparent;
    font-size: var(--fs-md);
    color: var(--color-text-muted);
    cursor: pointer;
    text-align: left;
    transition: background var(--tr-fast), color var(--tr-fast);

    &:hover { background: color-mix(in srgb, var(--color-primary) 6%, transparent); color: var(--color-text); }

    &--active {
      background: color-mix(in srgb, var(--color-primary) 10%, transparent);
      color: var(--color-primary);
      font-weight: 600;
    }

    &--danger:hover { color: var(--color-danger-light); }
    &--danger#{&}--active { background: color-mix(in srgb, var(--color-danger) 10%, transparent); color: var(--color-danger-light); }
  }

  &__nav-icon {
    font-size: var(--fs-sm);
    flex-shrink: 0;
  }

  /* ── Content area ────────────────────────────────────────────────── */
  &__content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* ── Section ─────────────────────────────────────────────────────── */
  &__section {
    display: flex;
    flex-direction: column;
    gap: 1rem;

    &-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--color-border);
    }

    &-title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text-heading);

      &--danger { color: var(--color-danger-light); }
    }

    &-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.75rem;
    }
  }

  /* ── Card ────────────────────────────────────────────────────────── */
  &__card {
    padding: 1.25rem 1.5rem;
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-surface) 80%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;

    &--warn  { border-color: color-mix(in srgb, var(--color-warn) 35%, transparent); }
    &--danger { border-color: color-mix(in srgb, var(--color-danger) 35%, transparent); }
  }

  /* ── Avatar ──────────────────────────────────────────────────────── */
  &__row {
    display: flex;
    align-items: center;
    gap: 1.25rem;
  }

  &__avatar-wrap {
    position: relative;
    flex-shrink: 0;
  }

  &__avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--color-border);
  }

  &__avatar-initials {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
    border: 2px solid var(--color-primary-border);
    color: var(--color-primary);
    font-family: var(--font-mono);
    font-size: 1.1rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__avatar-btn {
    position: absolute;
    bottom: -4px;
    right: -4px;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    font-size: 0.7rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color var(--tr-fast), color var(--tr-fast);

    &:hover { border-color: var(--color-primary-border); color: var(--color-primary); }
  }

  &__avatar-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  &__hidden-input { display: none; }

  /* ── Form elements ───────────────────────────────────────────────── */
  &__label {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-muted);
  }

  &__value {
    font-size: var(--fs-lg);
    color: var(--color-text);

    &--mono {
      font-family: var(--font-mono);
      font-size: var(--fs-sm);
    }
  }

  &__muted {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    line-height: 1.5;

    &--warn {
      color: var(--color-amber);
      opacity: var(--op-dim);
    }
  }

  &__kv-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  &__field-row {
    display: flex;
    gap: 0.6rem;

    &--actions { align-items: center; margin-top: 0.25rem; }
  }

  &__field-col {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__input {
    flex: 1;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.55rem 0.75rem;
    font-size: var(--fs-lg);
    font-family: var(--font-sans);
    color: var(--color-text);
    outline: none;
    transition: border-color var(--tr-fast), box-shadow var(--tr-fast);

    &::placeholder { color: var(--color-text-muted); opacity: var(--op-muted); }
    &:focus { border-color: var(--color-primary-border); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 8%, transparent); }
    &--danger:focus { border-color: var(--color-danger-border); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-danger) 8%, transparent); }
  }

  &__select {
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.55rem 0.75rem;
    font-size: var(--fs-sm);
    font-family: var(--font-mono);
    color: var(--color-text);
    outline: none;
    cursor: pointer;
    -moz-appearance: none;
    appearance: none;
    padding-right: 1.5rem;

    &:focus { border-color: var(--color-primary-border); }
  }

  /* ── Buttons ─────────────────────────────────────────────────────── */
  &__btn {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    cursor: pointer;
    border: 1px solid transparent;
    transition: opacity var(--tr-fast), box-shadow var(--tr-fast), background var(--tr-fast);

    &:disabled { opacity: var(--op-ghost); cursor: not-allowed; }

    &--primary {
      background: color-mix(in srgb, var(--color-primary) 10%, transparent);
      color: var(--color-primary);
      border-color: var(--color-primary-border);

      &:not(:disabled):hover { box-shadow: 0 0 12px color-mix(in srgb, var(--color-primary) 20%, transparent); }
    }

    &--ghost {
      background: transparent;
      color: var(--color-text-muted);
      border-color: var(--color-border);

      &:not(:disabled):hover { color: var(--color-text); border-color: color-mix(in srgb, var(--color-text) 30%, transparent); }
    }

    &--danger {
      background: transparent;
      color: var(--color-danger-light);
      border-color: var(--color-danger-border);

      &:not(:disabled):hover { background: color-mix(in srgb, var(--color-danger) 8%, transparent); }
    }

    &--danger-solid {
      background: color-mix(in srgb, var(--color-danger) 12%, transparent);
      color: var(--color-danger-light);
      border-color: var(--color-danger-border);

      &:not(:disabled):hover { background: color-mix(in srgb, var(--color-danger) 20%, transparent); }
    }

    &-check { color: var(--color-ok); }
  }

  &__link-btn {
    background: none;
    border: none;
    padding: 0;
    font-size: var(--fs-sm);
    color: var(--color-primary);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;

    &:hover { opacity: var(--op-partial); }
    &--danger { color: var(--color-danger-light); }
  }

  &__icon-btn {
    width: 28px;
    height: 28px;
    border-radius: var(--radius);
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--fs-sm);
    flex-shrink: 0;
    transition: background var(--tr-fast), border-color var(--tr-fast), color var(--tr-fast);

    &--danger {
      color: var(--color-text-muted);
      &:hover { color: var(--color-danger-light); border-color: var(--color-danger-border); background: color-mix(in srgb, var(--color-danger) 8%, transparent); }
    }
  }

  /* ── Badges ──────────────────────────────────────────────────────── */
  &__badge {
    @include badge-pill();
    flex-shrink: 0;

    &--primary { color: var(--color-primary);      border-color: var(--color-primary-border); background: color-mix(in srgb, var(--color-primary) 10%, transparent); }
    &--ok      { color: var(--color-ok);            border-color: var(--color-ok-border);      background: color-mix(in srgb, var(--color-ok) 10%, transparent); }
    &--warn    { color: var(--color-warn);          border-color: var(--color-warn-border);    background: color-mix(in srgb, var(--color-warn) 10%, transparent); }
    &--dim     { color: var(--color-text-muted);    border-color: var(--color-border);         background: transparent; }
  }

  /* ── Members list ────────────────────────────────────────────────── */
  &__members-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__member-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);

    &:last-child { border-bottom: none; }
  }

  &__member-avatar-wrap { flex-shrink: 0; }

  &__member-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid var(--color-border);
  }

  &__member-initials {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
    border: 1px solid var(--color-primary-border);
    color: var(--color-primary);
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__member-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    min-width: 0;
  }

  &__member-name {
    font-size: var(--fs-md);
    color: var(--color-text);
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__member-email {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    font-family: var(--font-mono);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* ── Sessions ────────────────────────────────────────────────────── */
  &__sessions-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__session-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0;
    border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);

    &:last-child { border-bottom: none; }
  }

  &__session-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  &__session-device {
    font-size: var(--fs-md);
    color: var(--color-text);
    font-weight: 500;
  }

  &__session-last {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    font-family: var(--font-mono);
  }

  /* ── Connected accounts ──────────────────────────────────────────── */
  &__connected-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.4rem 0;
    border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);

    &:last-child { border-bottom: none; }
  }

  &__connected-provider {
    font-size: var(--fs-md);
    font-weight: 600;
    color: var(--color-text);
    flex: 1;
  }

  &__connected-email {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
  }

  /* ── Feedback states ─────────────────────────────────────────────── */
  &__error   { font-size: var(--fs-sm); color: var(--color-danger-light); }
  &__ok      { font-size: var(--fs-sm); color: var(--color-ok); }
  &__loading { font-size: var(--fs-sm); color: var(--color-text-muted); opacity: var(--op-muted); }
}
</style>
