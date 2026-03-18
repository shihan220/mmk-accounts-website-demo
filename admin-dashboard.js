(() => {
    const PASSWORD_AUTO_HIDE_MS = 7000;
    const API_BASE = (() => {
        if (window.MMK_API_BASE) return window.MMK_API_BASE;
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:4000/api/v1';
        }
        return '/api/v1';
    })();

    const SESSION_KEY = 'mmk_admin_session_v1';
    const state = {
        accessToken: null,
        refreshToken: null,
        user: null,
        activeView: 'overview',
        loaded: {
            overview: false,
            inquiries: false,
            newsletter: false,
            users: false,
            audit: false
        },
        assignableUsers: [],
        selectedInquiryId: null,
        selectedInquiry: null,
        inquiryFilters: {
            page: 1,
            limit: 20,
            search: '',
            status: '',
            source: ''
        },
        inquiryPagination: {
            page: 1,
            totalPages: 1
        },
        subscribersFilters: {
            page: 1,
            limit: 20,
            search: '',
            status: ''
        },
        subscribersPagination: {
            page: 1,
            totalPages: 1
        },
        usersFilters: {
            page: 1,
            limit: 20,
            search: '',
            role: '',
            isActive: ''
        },
        usersPagination: {
            page: 1,
            totalPages: 1
        },
        usersIndex: {},
        auditFilters: {
            page: 1,
            limit: 20,
            actorId: '',
            action: '',
            entityType: ''
        },
        auditPagination: {
            page: 1,
            totalPages: 1
        }
    };

    const els = {};
    const passwordHideTimers = new Map();

    document.addEventListener('DOMContentLoaded', () => {
        cacheElements();
        bindEvents();
        restoreSession();
    });

    function cacheElements() {
        els.flash = getEl('flashMessage');
        els.authSection = getEl('authSection');
        els.appSection = getEl('appSection');
        els.loginForm = getEl('loginForm');
        els.loginIdentifier = getEl('loginIdentifier');
        els.loginPassword = getEl('loginPassword');
        els.loginBtn = getEl('loginBtn');
        els.authError = getEl('authError');
        els.registerForm = getEl('registerForm');
        els.registerName = getEl('registerName');
        els.registerEmail = getEl('registerEmail');
        els.registerPhone = getEl('registerPhone');
        els.registerPassword = getEl('registerPassword');
        els.registerRole = getEl('registerRole');
        els.registerBtn = getEl('registerBtn');
        els.registerError = getEl('registerError');
        els.logoutBtn = getEl('logoutBtn');
        els.refreshAllBtn = getEl('refreshAllBtn');

        els.currentUserName = getEl('currentUserName');
        els.currentUserEmail = getEl('currentUserEmail');
        els.currentUserRole = getEl('currentUserRole');

        els.tabs = Array.from(document.querySelectorAll('.view-tab'));
        els.panels = Array.from(document.querySelectorAll('.view-panel'));

        els.overviewDays = getEl('overviewDays');
        els.overviewReload = getEl('overviewReload');
        els.kpiTotalInquiries = getEl('kpiTotalInquiries');
        els.kpiNewInquiries = getEl('kpiNewInquiries');
        els.kpiInProgressInquiries = getEl('kpiInProgressInquiries');
        els.kpiResolvedInquiries = getEl('kpiResolvedInquiries');
        els.kpiRecentInquiries = getEl('kpiRecentInquiries');
        els.kpiActiveSubscribers = getEl('kpiActiveSubscribers');
        els.overviewBySource = getEl('overviewBySource');
        els.overviewLatestBody = getEl('overviewLatestBody');

        els.inquiriesFilters = getEl('inquiriesFilters');
        els.inquiriesSearch = getEl('inquiriesSearch');
        els.inquiriesStatus = getEl('inquiriesStatus');
        els.inquiriesSource = getEl('inquiriesSource');
        els.inquiriesBody = getEl('inquiriesBody');
        els.inquiriesPrev = getEl('inquiriesPrev');
        els.inquiriesNext = getEl('inquiriesNext');
        els.inquiriesPagination = getEl('inquiriesPagination');

        els.detailEmpty = getEl('detailEmpty');
        els.detailContent = getEl('detailContent');
        els.detailId = getEl('detailId');
        els.detailName = getEl('detailName');
        els.detailEmail = getEl('detailEmail');
        els.detailPhone = getEl('detailPhone');
        els.detailService = getEl('detailService');
        els.detailMessage = getEl('detailMessage');
        els.detailStatus = getEl('detailStatus');
        els.detailAssignee = getEl('detailAssignee');
        els.detailSave = getEl('detailSave');
        els.detailNotes = getEl('detailNotes');
        els.detailNoteInput = getEl('detailNoteInput');
        els.detailNoteAdd = getEl('detailNoteAdd');

        els.subscribersFilters = getEl('subscribersFilters');
        els.subsSearch = getEl('subsSearch');
        els.subsStatus = getEl('subsStatus');
        els.subsBody = getEl('subsBody');
        els.subsPrev = getEl('subsPrev');
        els.subsNext = getEl('subsNext');
        els.subsPagination = getEl('subsPagination');

        els.usersFilters = getEl('usersFilters');
        els.usersSearch = getEl('usersSearch');
        els.usersRole = getEl('usersRole');
        els.usersIsActive = getEl('usersIsActive');
        els.createUserForm = getEl('createUserForm');
        els.createUserName = getEl('createUserName');
        els.createUserEmail = getEl('createUserEmail');
        els.createUserPhone = getEl('createUserPhone');
        els.createUserPassword = getEl('createUserPassword');
        els.createUserRole = getEl('createUserRole');
        els.createUserActive = getEl('createUserActive');
        els.usersBody = getEl('usersBody');
        els.usersPrev = getEl('usersPrev');
        els.usersNext = getEl('usersNext');
        els.usersPagination = getEl('usersPagination');

        els.auditFilters = getEl('auditFilters');
        els.auditActorId = getEl('auditActorId');
        els.auditAction = getEl('auditAction');
        els.auditEntityType = getEl('auditEntityType');
        els.auditBody = getEl('auditBody');
        els.auditPrev = getEl('auditPrev');
        els.auditNext = getEl('auditNext');
        els.auditPagination = getEl('auditPagination');
    }

    function bindEvents() {
        initializePasswordToggles();
        els.loginForm.addEventListener('submit', onLoginSubmit);
        els.registerForm.addEventListener('submit', onRegisterSubmit);
        els.logoutBtn.addEventListener('click', onLogout);
        els.refreshAllBtn.addEventListener('click', async () => {
            await refreshCurrentView(true);
        });

        els.tabs.forEach((tab) => {
            tab.addEventListener('click', async () => {
                const view = tab.dataset.view;
                if (!view || view === state.activeView) return;
                if (isAdminOnlyView(view) && !isAdmin()) return;
                activateView(view);
                await refreshCurrentView(false);
            });
        });

        els.overviewReload.addEventListener('click', () => loadOverview(true));
        els.overviewDays.addEventListener('change', () => loadOverview(true));

        els.inquiriesFilters.addEventListener('submit', (event) => {
            event.preventDefault();
            state.inquiryFilters.page = 1;
            state.inquiryFilters.search = els.inquiriesSearch.value.trim();
            state.inquiryFilters.status = els.inquiriesStatus.value;
            state.inquiryFilters.source = els.inquiriesSource.value;
            loadInquiries(true);
        });
        els.inquiriesPrev.addEventListener('click', () => changePage('inquiries', -1));
        els.inquiriesNext.addEventListener('click', () => changePage('inquiries', 1));
        els.inquiriesBody.addEventListener('click', (event) => {
            const row = event.target.closest('tr[data-id]');
            if (!row) return;
            selectInquiry(row.dataset.id);
        });
        els.detailSave.addEventListener('click', onSaveInquiry);
        els.detailNoteAdd.addEventListener('click', onAddInquiryNote);

        els.subscribersFilters.addEventListener('submit', (event) => {
            event.preventDefault();
            state.subscribersFilters.page = 1;
            state.subscribersFilters.search = els.subsSearch.value.trim();
            state.subscribersFilters.status = els.subsStatus.value;
            loadSubscribers(true);
        });
        els.subsPrev.addEventListener('click', () => changePage('newsletter', -1));
        els.subsNext.addEventListener('click', () => changePage('newsletter', 1));
        els.subsBody.addEventListener('click', onSubscribersTableClick);

        els.usersFilters.addEventListener('submit', (event) => {
            event.preventDefault();
            state.usersFilters.page = 1;
            state.usersFilters.search = els.usersSearch.value.trim();
            state.usersFilters.role = els.usersRole.value;
            state.usersFilters.isActive = els.usersIsActive.value;
            loadUsers(true);
        });
        els.usersPrev.addEventListener('click', () => changePage('users', -1));
        els.usersNext.addEventListener('click', () => changePage('users', 1));
        els.usersBody.addEventListener('click', onUsersTableClick);
        els.createUserForm.addEventListener('submit', onCreateUserSubmit);

        els.auditFilters.addEventListener('submit', (event) => {
            event.preventDefault();
            state.auditFilters.page = 1;
            state.auditFilters.actorId = els.auditActorId.value.trim();
            state.auditFilters.action = els.auditAction.value.trim();
            state.auditFilters.entityType = els.auditEntityType.value.trim();
            loadAuditLogs(true);
        });
        els.auditPrev.addEventListener('click', () => changePage('audit', -1));
        els.auditNext.addEventListener('click', () => changePage('audit', 1));
    }

    function initializePasswordToggles() {
        const toggleButtons = Array.from(document.querySelectorAll('[data-password-toggle]'));

        toggleButtons.forEach((button) => {
            const targetId = button.getAttribute('data-password-toggle');
            if (!targetId) return;

            const input = document.getElementById(targetId);
            if (!(input instanceof HTMLInputElement)) return;

            updatePasswordToggleButton(button, false);
            input.type = 'password';
            clearPasswordAutoHideTimer(input);

            if (button.dataset.passwordToggleBound === '1') return;
            button.dataset.passwordToggleBound = '1';

            button.addEventListener('click', () => {
                const shouldShow = input.type === 'password';
                input.type = shouldShow ? 'text' : 'password';
                updatePasswordToggleButton(button, shouldShow);

                if (shouldShow) {
                    startPasswordAutoHide(button, input);
                } else {
                    clearPasswordAutoHideTimer(input);
                }

                input.focus({ preventScroll: true });
                const cursorPos = input.value.length;
                input.setSelectionRange(cursorPos, cursorPos);
            });
        });
    }

    function resetPasswordToggles() {
        const toggleButtons = Array.from(document.querySelectorAll('[data-password-toggle]'));
        toggleButtons.forEach((button) => {
            const targetId = button.getAttribute('data-password-toggle');
            if (!targetId) return;
            const input = document.getElementById(targetId);
            if (!(input instanceof HTMLInputElement)) return;
            input.type = 'password';
            clearPasswordAutoHideTimer(input);
            updatePasswordToggleButton(button, false);
        });
    }

    function startPasswordAutoHide(button, input) {
        clearPasswordAutoHideTimer(input);
        const timerId = window.setTimeout(() => {
            input.type = 'password';
            updatePasswordToggleButton(button, false);
            passwordHideTimers.delete(input);
        }, PASSWORD_AUTO_HIDE_MS);
        passwordHideTimers.set(input, timerId);
    }

    function clearPasswordAutoHideTimer(input) {
        const timerId = passwordHideTimers.get(input);
        if (!timerId) return;
        window.clearTimeout(timerId);
        passwordHideTimers.delete(input);
    }

    function updatePasswordToggleButton(button, isVisible) {
        button.classList.toggle('is-visible', isVisible);
        button.setAttribute('aria-pressed', String(isVisible));
        button.setAttribute('aria-label', isVisible ? 'Hide password' : 'Show password');
    }

    function getEl(id) {
        const el = document.getElementById(id);
        if (!el) {
            throw new Error(`Missing required element: ${id}`);
        }
        return el;
    }

    function showFlash(message, kind = 'ok', persistMs = 4200) {
        els.flash.textContent = message;
        els.flash.classList.remove('ok', 'err');
        els.flash.classList.add(kind === 'err' ? 'err' : 'ok');
        if (persistMs > 0) {
            window.clearTimeout(showFlash.timerId);
            showFlash.timerId = window.setTimeout(() => {
                els.flash.textContent = '';
                els.flash.classList.remove('ok', 'err');
            }, persistMs);
        }
    }

    function setAuthVisible(isAuthenticated) {
        els.authSection.classList.toggle('is-hidden', isAuthenticated);
        els.appSection.classList.toggle('is-hidden', !isAuthenticated);
        els.logoutBtn.disabled = !isAuthenticated;
        els.refreshAllBtn.disabled = !isAuthenticated;
    }

    async function onLoginSubmit(event) {
        event.preventDefault();
        els.authError.textContent = '';
        const identifier = els.loginIdentifier.value.trim();
        const password = els.loginPassword.value;
        if (!identifier || !password) {
            els.authError.textContent = 'Identifier and password are required.';
            return;
        }

        setButtonLoading(els.loginBtn, true, 'Signing In...');
        try {
            const body = await apiRequest('/auth/login', {
                method: 'POST',
                body: { identifier, password },
                auth: false,
                retry: false
            });
            setSession(body.data);
            await bootstrapAuthenticated();
            showFlash('Signed in successfully.');
            els.loginPassword.value = '';
        } catch (error) {
            els.authError.textContent = error.message || 'Login failed.';
        } finally {
            setButtonLoading(els.loginBtn, false, 'Sign In');
        }
    }

    async function onRegisterSubmit(event) {
        event.preventDefault();
        els.registerError.textContent = '';

        const payload = {
            fullName: els.registerName.value.trim(),
            email: els.registerEmail.value.trim().toLowerCase(),
            phone: els.registerPhone.value.trim(),
            password: els.registerPassword.value,
            role: els.registerRole.value
        };

        if (!payload.fullName || !payload.email || !payload.phone || !payload.password) {
            els.registerError.textContent = 'Please complete all required fields.';
            return;
        }

        setButtonLoading(els.registerBtn, true, 'Creating...');
        try {
            const body = await apiRequest('/auth/register', {
                method: 'POST',
                body: payload,
                auth: false,
                retry: false
            });
            setSession(body.data);
            await bootstrapAuthenticated();
            showFlash('Account created and signed in.');
            els.registerForm.reset();
            els.registerRole.value = 'STAFF';
            resetPasswordToggles();
        } catch (error) {
            els.registerError.textContent = error.message || 'Registration failed.';
        } finally {
            setButtonLoading(els.registerBtn, false, 'Create Account');
        }
    }

    async function onLogout() {
        try {
            await apiRequest('/auth/logout', {
                method: 'POST',
                body: { refreshToken: state.refreshToken },
                auth: false,
                retry: false
            });
        } catch (_error) {
            // Clear local session regardless.
        }
        clearSession();
        resetUiForLoggedOut();
        showFlash('Logged out.', 'ok', 2500);
    }

    function setSession(payload) {
        state.accessToken = payload?.accessToken || null;
        state.refreshToken = payload?.refreshToken || null;
        state.user = payload?.user || null;
        persistSession();
    }

    function persistSession() {
        const data = {
            accessToken: state.accessToken,
            refreshToken: state.refreshToken,
            user: state.user
        };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(data));
    }

    function clearSession() {
        state.accessToken = null;
        state.refreshToken = null;
        state.user = null;
        sessionStorage.removeItem(SESSION_KEY);
    }

    async function restoreSession() {
        const raw = sessionStorage.getItem(SESSION_KEY);
        if (!raw) {
            setAuthVisible(false);
            return;
        }
        try {
            const parsed = JSON.parse(raw);
            state.accessToken = parsed.accessToken || null;
            state.refreshToken = parsed.refreshToken || null;
            state.user = parsed.user || null;
            if (!state.accessToken || !state.refreshToken) {
                throw new Error('Session incomplete');
            }
            await bootstrapAuthenticated();
        } catch (_error) {
            clearSession();
            resetUiForLoggedOut();
        }
    }

    async function bootstrapAuthenticated() {
        try {
            const me = await getMe();
            state.user = me;
            persistSession();
            setAuthVisible(true);
            updateSessionBar();
            applyRoleAccess();
            await loadAssignableUsers();
            await refreshCurrentView(true);
        } catch (error) {
            clearSession();
            resetUiForLoggedOut();
            els.authError.textContent = 'Session expired. Please sign in again.';
        }
    }

    function resetUiForLoggedOut() {
        setAuthVisible(false);
        els.currentUserName.textContent = 'Not signed in';
        els.currentUserEmail.textContent = '';
        els.currentUserRole.textContent = 'GUEST';
        els.authError.textContent = '';
        els.registerError.textContent = '';

        state.activeView = 'overview';
        state.selectedInquiry = null;
        state.selectedInquiryId = null;
        state.loaded = {
            overview: false,
            inquiries: false,
            newsletter: false,
            users: false,
            audit: false
        };
        activateView('overview');
        resetInquiryDetail();
    }

    function updateSessionBar() {
        const user = state.user;
        els.currentUserName.textContent = user?.fullName || 'Unknown User';
        els.currentUserEmail.textContent = user?.email ? `(${user.email})` : '';
        els.currentUserRole.textContent = user?.role || 'UNKNOWN';
    }

    function applyRoleAccess() {
        const admin = isAdmin();
        const usersTab = els.tabs.find((tab) => tab.dataset.view === 'users');
        const auditTab = els.tabs.find((tab) => tab.dataset.view === 'audit');
        const usersPanel = getPanel('users');
        const auditPanel = getPanel('audit');

        usersTab.classList.toggle('is-hidden', !admin);
        auditTab.classList.toggle('is-hidden', !admin);
        usersPanel.classList.toggle('is-hidden', !admin);
        auditPanel.classList.toggle('is-hidden', !admin);

        if (!admin && (state.activeView === 'users' || state.activeView === 'audit')) {
            activateView('overview');
        }
    }

    function isAdmin() {
        return state.user?.role === 'ADMIN';
    }

    function isAdminOnlyView(view) {
        return view === 'users' || view === 'audit';
    }

    function getPanel(view) {
        return document.getElementById(`view-${view}`);
    }

    function activateView(view) {
        state.activeView = view;
        els.tabs.forEach((tab) => {
            tab.classList.toggle('active', tab.dataset.view === view);
        });
        els.panels.forEach((panel) => {
            panel.classList.toggle('active', panel.id === `view-${view}`);
        });
    }

    async function refreshCurrentView(force = false) {
        if (!state.user) return;
        switch (state.activeView) {
            case 'overview':
                await loadOverview(force);
                break;
            case 'inquiries':
                await loadInquiries(force);
                break;
            case 'newsletter':
                await loadSubscribers(force);
                break;
            case 'users':
                if (isAdmin()) await loadUsers(force);
                break;
            case 'audit':
                if (isAdmin()) await loadAuditLogs(force);
                break;
            default:
                break;
        }
    }

    async function loadOverview(force = false) {
        if (!force && state.loaded.overview) return;
        try {
            const days = Number(els.overviewDays.value) || 30;
            const body = await apiRequest(`/admin/dashboard?days=${encodeURIComponent(days)}`);
            renderOverview(body.data || {});
            state.loaded.overview = true;
        } catch (error) {
            showFlash(`Overview: ${error.message}`, 'err');
        }
    }

    function renderOverview(data) {
        const inquiries = data.inquiries || {};
        const newsletter = data.newsletter || {};

        els.kpiTotalInquiries.textContent = String(inquiries.total ?? 0);
        els.kpiNewInquiries.textContent = String(inquiries.new ?? 0);
        els.kpiInProgressInquiries.textContent = String(inquiries.inProgress ?? 0);
        els.kpiResolvedInquiries.textContent = String(inquiries.resolvedOrClosed ?? 0);
        els.kpiRecentInquiries.textContent = String(inquiries.receivedInLastWindow ?? 0);
        els.kpiActiveSubscribers.textContent = String(newsletter.active ?? 0);

        const bySource = Array.isArray(inquiries.bySource) ? inquiries.bySource : [];
        if (bySource.length === 0) {
            els.overviewBySource.innerHTML = '<li class="empty-state">No source data yet.</li>';
        } else {
            els.overviewBySource.innerHTML = bySource
                .map((item) => `<li><strong>${escapeHtml(item.source || 'UNKNOWN')}</strong>: ${Number(item.count || 0)}</li>`)
                .join('');
        }

        const latest = Array.isArray(data.latestInquiries) ? data.latestInquiries : [];
        if (latest.length === 0) {
            els.overviewLatestBody.innerHTML = '<tr><td colspan="4" class="empty-state">No inquiries yet.</td></tr>';
        } else {
            els.overviewLatestBody.innerHTML = latest
                .map((item) => `
                    <tr>
                        <td>${formatDate(item.submittedAt)}</td>
                        <td>${escapeHtml(item.fullName || '-')}</td>
                        <td>${escapeHtml(item.source || '-')}</td>
                        <td>${renderStatusChip(item.status)}</td>
                    </tr>
                `)
                .join('');
        }
    }

    async function loadInquiries(force = false) {
        if (!force && state.loaded.inquiries) return;

        renderTableLoading(els.inquiriesBody, 6, 'Loading inquiries...');
        try {
            const query = buildQuery({
                page: state.inquiryFilters.page,
                limit: state.inquiryFilters.limit,
                search: state.inquiryFilters.search,
                status: state.inquiryFilters.status,
                source: state.inquiryFilters.source
            });
            const body = await apiRequest(`/inquiries?${query}`);
            const items = Array.isArray(body.data) ? body.data : [];
            const pagination = body.meta?.pagination || { page: 1, totalPages: 1 };
            state.inquiryPagination.page = Number(pagination.page || 1);
            state.inquiryPagination.totalPages = Number(pagination.totalPages || 1);
            state.inquiryFilters.page = state.inquiryPagination.page;

            renderInquiries(items);
            applyPager(els.inquiriesPagination, els.inquiriesPrev, els.inquiriesNext, state.inquiryPagination);
            state.loaded.inquiries = true;

            if (state.selectedInquiryId) {
                const found = items.find((item) => item.id === state.selectedInquiryId);
                if (!found) {
                    resetInquiryDetail();
                }
            }
        } catch (error) {
            renderTableError(els.inquiriesBody, 6, error.message);
            showFlash(`Inquiries: ${error.message}`, 'err');
        }
    }

    function renderInquiries(items) {
        if (!items.length) {
            els.inquiriesBody.innerHTML = '<tr><td colspan="6" class="empty-state">No inquiries matched your filters.</td></tr>';
            return;
        }

        els.inquiriesBody.innerHTML = items
            .map((inquiry) => {
                const isSelected = inquiry.id === state.selectedInquiryId;
                const assigned = inquiry.assignedTo?.fullName || '-';
                return `
                    <tr class="clickable ${isSelected ? 'selected' : ''}" data-id="${escapeHtml(inquiry.id)}">
                        <td>${formatDate(inquiry.submittedAt)}</td>
                        <td>${escapeHtml(inquiry.fullName || '-')}</td>
                        <td>${escapeHtml(inquiry.email || '-')}</td>
                        <td>${escapeHtml(inquiry.source || '-')}</td>
                        <td>${renderStatusChip(inquiry.status)}</td>
                        <td>${escapeHtml(assigned)}</td>
                    </tr>
                `;
            })
            .join('');
    }

    async function selectInquiry(id) {
        if (!id) return;
        state.selectedInquiryId = id;
        renderInquiriesSelection();
        await loadInquiryDetail(id);
    }

    function renderInquiriesSelection() {
        Array.from(els.inquiriesBody.querySelectorAll('tr[data-id]')).forEach((row) => {
            row.classList.toggle('selected', row.dataset.id === state.selectedInquiryId);
        });
    }

    async function loadInquiryDetail(id) {
        if (!id) return;
        els.detailEmpty.classList.add('is-hidden');
        els.detailContent.classList.remove('is-hidden');
        els.detailMessage.textContent = 'Loading...';

        try {
            const body = await apiRequest(`/inquiries/${encodeURIComponent(id)}`);
            state.selectedInquiry = body.data;
            renderInquiryDetail(state.selectedInquiry);
        } catch (error) {
            showFlash(`Inquiry detail: ${error.message}`, 'err');
            resetInquiryDetail();
        }
    }

    function renderInquiryDetail(inquiry) {
        if (!inquiry) {
            resetInquiryDetail();
            return;
        }

        els.detailId.textContent = inquiry.id;
        els.detailName.textContent = inquiry.fullName || '-';
        els.detailEmail.textContent = inquiry.email || '-';
        els.detailPhone.textContent = inquiry.phone || '-';
        els.detailService.textContent = inquiry.service || '-';
        els.detailMessage.textContent = inquiry.message || '-';
        els.detailStatus.value = inquiry.status || 'NEW';

        renderAssigneeSelect(inquiry.assignedTo?.id || '');

        const notes = Array.isArray(inquiry.notes) ? inquiry.notes : [];
        if (!notes.length) {
            els.detailNotes.innerHTML = '<li class="empty-state">No notes yet.</li>';
        } else {
            els.detailNotes.innerHTML = notes
                .map((note) => {
                    const author = note.author?.fullName || note.author?.email || 'Unknown';
                    return `<li><strong>${escapeHtml(author)}</strong> · ${formatDate(note.createdAt)}<br>${escapeHtml(note.note || '')}</li>`;
                })
                .join('');
        }
        els.detailNoteInput.value = '';
    }

    function renderAssigneeSelect(selectedUserId) {
        const allowAssignment = state.assignableUsers.length > 0;
        let options = '<option value="">Unassigned</option>';

        state.assignableUsers.forEach((user) => {
            options += `<option value="${escapeHtml(user.id)}">${escapeHtml(user.fullName)} (${escapeHtml(user.role)})</option>`;
        });

        els.detailAssignee.innerHTML = options;
        els.detailAssignee.value = selectedUserId || '';
        els.detailAssignee.disabled = !allowAssignment;
    }

    function resetInquiryDetail() {
        state.selectedInquiryId = null;
        state.selectedInquiry = null;
        els.detailEmpty.classList.remove('is-hidden');
        els.detailContent.classList.add('is-hidden');
        els.detailNotes.innerHTML = '';
        renderInquiriesSelection();
    }

    async function onSaveInquiry() {
        if (!state.selectedInquiryId || !state.selectedInquiry) {
            showFlash('Select an inquiry first.', 'err');
            return;
        }

        const payload = {};
        const selectedStatus = els.detailStatus.value;
        const selectedAssigneeId = els.detailAssignee.value || null;

        if (selectedStatus !== state.selectedInquiry.status) {
            payload.status = selectedStatus;
        }

        if (!els.detailAssignee.disabled) {
            const currentAssigneeId = state.selectedInquiry.assignedTo?.id || null;
            if (selectedAssigneeId !== currentAssigneeId) {
                payload.assignedToId = selectedAssigneeId;
            }
        }

        if (Object.keys(payload).length === 0) {
            showFlash('No changes to save.', 'ok', 2500);
            return;
        }

        setButtonLoading(els.detailSave, true, 'Saving...');
        try {
            await apiRequest(`/inquiries/${encodeURIComponent(state.selectedInquiryId)}`, {
                method: 'PATCH',
                body: payload
            });
            showFlash('Inquiry updated.');
            state.loaded.overview = false;
            await Promise.all([loadInquiries(true), loadInquiryDetail(state.selectedInquiryId)]);
        } catch (error) {
            showFlash(`Save inquiry failed: ${error.message}`, 'err');
        } finally {
            setButtonLoading(els.detailSave, false, 'Save Inquiry');
        }
    }

    async function onAddInquiryNote() {
        if (!state.selectedInquiryId) {
            showFlash('Select an inquiry first.', 'err');
            return;
        }
        const note = els.detailNoteInput.value.trim();
        if (note.length < 2) {
            showFlash('Note must be at least 2 characters.', 'err');
            return;
        }

        setButtonLoading(els.detailNoteAdd, true, 'Adding...');
        try {
            await apiRequest(`/inquiries/${encodeURIComponent(state.selectedInquiryId)}/notes`, {
                method: 'POST',
                body: { note }
            });
            showFlash('Note added.');
            await loadInquiryDetail(state.selectedInquiryId);
        } catch (error) {
            showFlash(`Add note failed: ${error.message}`, 'err');
        } finally {
            setButtonLoading(els.detailNoteAdd, false, 'Add Note');
        }
    }

    async function loadSubscribers(force = false) {
        if (!force && state.loaded.newsletter) return;

        renderTableLoading(els.subsBody, 5, 'Loading subscribers...');
        try {
            const query = buildQuery({
                page: state.subscribersFilters.page,
                limit: state.subscribersFilters.limit,
                search: state.subscribersFilters.search,
                status: state.subscribersFilters.status
            });
            const body = await apiRequest(`/newsletter/subscribers?${query}`);
            const items = Array.isArray(body.data) ? body.data : [];
            const pagination = body.meta?.pagination || { page: 1, totalPages: 1 };
            state.subscribersPagination.page = Number(pagination.page || 1);
            state.subscribersPagination.totalPages = Number(pagination.totalPages || 1);
            state.subscribersFilters.page = state.subscribersPagination.page;

            renderSubscribers(items);
            applyPager(els.subsPagination, els.subsPrev, els.subsNext, state.subscribersPagination);
            state.loaded.newsletter = true;
        } catch (error) {
            renderTableError(els.subsBody, 5, error.message);
            showFlash(`Subscribers: ${error.message}`, 'err');
        }
    }

    function renderSubscribers(items) {
        if (!items.length) {
            els.subsBody.innerHTML = '<tr><td colspan="5" class="empty-state">No subscribers found.</td></tr>';
            return;
        }

        els.subsBody.innerHTML = items
            .map((item) => {
                const nextStatus = item.status === 'ACTIVE' ? 'UNSUBSCRIBED' : 'ACTIVE';
                const actionLabel = nextStatus === 'ACTIVE' ? 'Activate' : 'Unsubscribe';
                return `
                    <tr>
                        <td>${escapeHtml(item.email || '-')}</td>
                        <td>${renderStatusChip(item.status)}</td>
                        <td>${escapeHtml(item.sourcePage || '-')}</td>
                        <td>${formatDate(item.subscribedAt)}</td>
                        <td>
                            <button class="btn btn-secondary" data-action="toggle-subscriber" data-id="${escapeHtml(item.id)}" data-next-status="${nextStatus}">${actionLabel}</button>
                        </td>
                    </tr>
                `;
            })
            .join('');
    }

    async function onSubscribersTableClick(event) {
        const button = event.target.closest('button[data-action="toggle-subscriber"]');
        if (!button) return;

        const id = button.dataset.id;
        const status = button.dataset.nextStatus;
        if (!id || !status) return;

        setButtonLoading(button, true, 'Updating...');
        try {
            await apiRequest(`/newsletter/subscribers/${encodeURIComponent(id)}`, {
                method: 'PATCH',
                body: { status }
            });
            showFlash('Subscriber updated.');
            state.loaded.overview = false;
            await loadSubscribers(true);
        } catch (error) {
            showFlash(`Subscriber update failed: ${error.message}`, 'err');
        } finally {
            setButtonLoading(button, false, button.dataset.nextStatus === 'ACTIVE' ? 'Activate' : 'Unsubscribe');
        }
    }

    async function loadUsers(force = false) {
        if (!isAdmin()) return;
        if (!force && state.loaded.users) return;

        renderTableLoading(els.usersBody, 6, 'Loading users...');
        try {
            const query = buildQuery({
                page: state.usersFilters.page,
                limit: state.usersFilters.limit,
                search: state.usersFilters.search,
                role: state.usersFilters.role,
                isActive: state.usersFilters.isActive
            });
            const body = await apiRequest(`/users?${query}`);
            const items = Array.isArray(body.data) ? body.data : [];
            const pagination = body.meta?.pagination || { page: 1, totalPages: 1 };
            state.usersPagination.page = Number(pagination.page || 1);
            state.usersPagination.totalPages = Number(pagination.totalPages || 1);
            state.usersFilters.page = state.usersPagination.page;
            state.usersIndex = Object.fromEntries(items.map((item) => [item.id, item]));

            renderUsers(items);
            applyPager(els.usersPagination, els.usersPrev, els.usersNext, state.usersPagination);
            state.loaded.users = true;
        } catch (error) {
            renderTableError(els.usersBody, 6, error.message);
            showFlash(`Users: ${error.message}`, 'err');
        }
    }

    function renderUsers(items) {
        if (!items.length) {
            els.usersBody.innerHTML = '<tr><td colspan="6" class="empty-state">No users matched your filters.</td></tr>';
            return;
        }

        els.usersBody.innerHTML = items
            .map((user) => {
                const roleOptions = ['ADMIN', 'STAFF']
                    .map((role) => `<option value="${role}" ${role === user.role ? 'selected' : ''}>${role}</option>`)
                    .join('');
                return `
                    <tr data-id="${escapeHtml(user.id)}">
                        <td>${escapeHtml(user.fullName || '-')}</td>
                        <td>${escapeHtml(user.email || '-')}</td>
                        <td>${escapeHtml(user.phone || '-')}</td>
                        <td>
                            <select data-field="role">${roleOptions}</select>
                        </td>
                        <td>
                            <label class="check-row">
                                <input data-field="isActive" type="checkbox" ${user.isActive ? 'checked' : ''}>
                                ${user.isActive ? 'Active' : 'Inactive'}
                            </label>
                        </td>
                        <td>
                            <button class="btn btn-secondary" data-action="save-user">Save</button>
                        </td>
                    </tr>
                `;
            })
            .join('');
    }

    async function onCreateUserSubmit(event) {
        event.preventDefault();
        if (!isAdmin()) return;

        const payload = {
            fullName: els.createUserName.value.trim(),
            email: els.createUserEmail.value.trim().toLowerCase(),
            phone: els.createUserPhone.value.trim(),
            password: els.createUserPassword.value,
            role: els.createUserRole.value,
            isActive: els.createUserActive.checked
        };

        if (!payload.fullName || !payload.email || !payload.phone || !payload.password) {
            showFlash('Name, email, phone and password are required.', 'err');
            return;
        }

        const submit = els.createUserForm.querySelector('button[type="submit"]');
        setButtonLoading(submit, true, 'Creating...');
        try {
            await apiRequest('/users', {
                method: 'POST',
                body: payload
            });
            showFlash('User created.');
            els.createUserForm.reset();
            els.createUserRole.value = 'STAFF';
            els.createUserActive.checked = true;
            resetPasswordToggles();
            await Promise.all([loadUsers(true), loadAssignableUsers(true)]);
        } catch (error) {
            showFlash(`Create user failed: ${error.message}`, 'err');
        } finally {
            setButtonLoading(submit, false, 'Create');
        }
    }

    async function onUsersTableClick(event) {
        const button = event.target.closest('button[data-action="save-user"]');
        if (!button) return;
        const row = button.closest('tr[data-id]');
        if (!row) return;
        const userId = row.dataset.id;
        const existing = state.usersIndex[userId];
        if (!existing) return;

        const roleSelect = row.querySelector('select[data-field="role"]');
        const activeCheckbox = row.querySelector('input[data-field="isActive"]');
        const payload = {};

        if (roleSelect.value !== existing.role) payload.role = roleSelect.value;
        if (activeCheckbox.checked !== Boolean(existing.isActive)) payload.isActive = activeCheckbox.checked;

        if (!Object.keys(payload).length) {
            showFlash('No user changes to save.', 'ok', 2500);
            return;
        }

        setButtonLoading(button, true, 'Saving...');
        try {
            await apiRequest(`/users/${encodeURIComponent(userId)}`, {
                method: 'PATCH',
                body: payload
            });
            showFlash('User updated.');
            await Promise.all([loadUsers(true), loadAssignableUsers(true)]);
        } catch (error) {
            showFlash(`User update failed: ${error.message}`, 'err');
        } finally {
            setButtonLoading(button, false, 'Save');
        }
    }

    async function loadAuditLogs(force = false) {
        if (!isAdmin()) return;
        if (!force && state.loaded.audit) return;

        renderTableLoading(els.auditBody, 5, 'Loading audit logs...');
        try {
            const query = buildQuery({
                page: state.auditFilters.page,
                limit: state.auditFilters.limit,
                actorId: state.auditFilters.actorId,
                action: state.auditFilters.action,
                entityType: state.auditFilters.entityType
            });
            const body = await apiRequest(`/admin/audit-logs?${query}`);
            const items = Array.isArray(body.data) ? body.data : [];
            const pagination = body.meta?.pagination || { page: 1, totalPages: 1 };
            state.auditPagination.page = Number(pagination.page || 1);
            state.auditPagination.totalPages = Number(pagination.totalPages || 1);
            state.auditFilters.page = state.auditPagination.page;

            renderAudit(items);
            applyPager(els.auditPagination, els.auditPrev, els.auditNext, state.auditPagination);
            state.loaded.audit = true;
        } catch (error) {
            renderTableError(els.auditBody, 5, error.message);
            showFlash(`Audit logs: ${error.message}`, 'err');
        }
    }

    function renderAudit(items) {
        if (!items.length) {
            els.auditBody.innerHTML = '<tr><td colspan="5" class="empty-state">No audit logs matched filters.</td></tr>';
            return;
        }

        els.auditBody.innerHTML = items
            .map((item) => {
                const actor = item.actor?.fullName || item.actor?.email || '-';
                const entity = item.entityType || '-';
                return `
                    <tr>
                        <td>${formatDate(item.createdAt)}</td>
                        <td>${escapeHtml(actor)}</td>
                        <td>${escapeHtml(item.action || '-')}</td>
                        <td>${escapeHtml(entity)}</td>
                        <td class="small">${escapeHtml(item.entityId || '-')}</td>
                    </tr>
                `;
            })
            .join('');
    }

    async function loadAssignableUsers(force = false) {
        if (!isAdmin()) {
            state.assignableUsers = [];
            renderAssigneeSelect(state.selectedInquiry?.assignedTo?.id || '');
            return;
        }

        if (!force && state.assignableUsers.length > 0) return;

        try {
            const body = await apiRequest('/users?limit=100&isActive=true');
            state.assignableUsers = Array.isArray(body.data) ? body.data : [];
            renderAssigneeSelect(state.selectedInquiry?.assignedTo?.id || '');
        } catch (error) {
            state.assignableUsers = [];
            renderAssigneeSelect(state.selectedInquiry?.assignedTo?.id || '');
            showFlash(`Unable to load assignees: ${error.message}`, 'err');
        }
    }

    function changePage(view, delta) {
        if (view === 'inquiries') {
            const next = state.inquiryFilters.page + delta;
            if (next < 1 || next > state.inquiryPagination.totalPages) return;
            state.inquiryFilters.page = next;
            loadInquiries(true);
            return;
        }

        if (view === 'newsletter') {
            const next = state.subscribersFilters.page + delta;
            if (next < 1 || next > state.subscribersPagination.totalPages) return;
            state.subscribersFilters.page = next;
            loadSubscribers(true);
            return;
        }

        if (view === 'users') {
            const next = state.usersFilters.page + delta;
            if (next < 1 || next > state.usersPagination.totalPages) return;
            state.usersFilters.page = next;
            loadUsers(true);
            return;
        }

        if (view === 'audit') {
            const next = state.auditFilters.page + delta;
            if (next < 1 || next > state.auditPagination.totalPages) return;
            state.auditFilters.page = next;
            loadAuditLogs(true);
        }
    }

    async function getMe() {
        const body = await apiRequest('/auth/me');
        return body.data;
    }

    async function refreshTokenFlow() {
        if (!state.refreshToken) return false;
        try {
            const body = await apiRequest('/auth/refresh', {
                method: 'POST',
                body: { refreshToken: state.refreshToken },
                auth: false,
                retry: false
            });
            if (!body?.data?.accessToken || !body?.data?.refreshToken || !body?.data?.user) {
                return false;
            }
            setSession(body.data);
            updateSessionBar();
            return true;
        } catch (_error) {
            return false;
        }
    }

    async function apiRequest(path, options = {}) {
        const method = options.method || 'GET';
        const body = options.body;
        const auth = options.auth !== false;
        const retry = options.retry !== false;

        const headers = {
            Accept: 'application/json'
        };

        if (body !== undefined) {
            headers['Content-Type'] = 'application/json';
        }

        if (auth) {
            if (!state.accessToken) {
                throw new Error('Missing access token. Please sign in again.');
            }
            headers.Authorization = `Bearer ${state.accessToken}`;
        }

        const response = await fetch(`${API_BASE}${path}`, {
            method,
            headers,
            credentials: 'include',
            body: body !== undefined ? JSON.stringify(body) : undefined
        });

        const payload = await response.json().catch(() => null);

        if (response.status === 401 && auth && retry) {
            const refreshed = await refreshTokenFlow();
            if (refreshed) {
                return apiRequest(path, {
                    ...options,
                    retry: false
                });
            }
            clearSession();
            resetUiForLoggedOut();
            throw new Error('Session expired. Please sign in again.');
        }

        if (!response.ok || !payload || payload.success === false) {
            const message = payload?.error?.message || payload?.message || `Request failed (${response.status})`;
            throw new Error(message);
        }

        return payload;
    }

    function setButtonLoading(button, isLoading, loadingText) {
        if (!button) return;
        if (isLoading) {
            button.dataset.originalText = button.textContent;
            button.textContent = loadingText;
            button.disabled = true;
        } else {
            const fallback = button.dataset.originalText || button.textContent;
            button.textContent = fallback;
            button.disabled = false;
            delete button.dataset.originalText;
        }
    }

    function renderTableLoading(tbody, colspan, label) {
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="empty-state">${escapeHtml(label)}</td></tr>`;
    }

    function renderTableError(tbody, colspan, message) {
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="empty-state">${escapeHtml(message)}</td></tr>`;
    }

    function applyPager(labelEl, prevBtn, nextBtn, pagination) {
        const page = Number(pagination.page || 1);
        const totalPages = Number(pagination.totalPages || 1);
        labelEl.textContent = `Page ${page} / ${totalPages}`;
        prevBtn.disabled = page <= 1;
        nextBtn.disabled = page >= totalPages;
    }

    function buildQuery(params) {
        const query = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value === undefined || value === null || value === '') return;
            query.set(key, String(value));
        });
        return query.toString();
    }

    function formatDate(value) {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return new Intl.DateTimeFormat('en-GB', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    }

    function renderStatusChip(status) {
        const safe = escapeHtml(status || 'UNKNOWN');
        const css = String(status || 'UNKNOWN').replace(/[^A-Z_]/g, '');
        return `<span class="status-chip status-${css}">${safe}</span>`;
    }

    function escapeHtml(value) {
        return String(value)
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }
})();
