import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { GraphqlService } from '../service/graphql.service';
import { 
  KUBERA_PUBLIC_PROFILE_LOGIN_USER_NAME, 
  KUBERA_PUBLIC_PROFILE_LOGIN_PASSWORD,
  KUBERA_ACCOUNT_MENU_GRAPHQL_QUERY_API,
  KUBERA_ACCOUNT_MENU_GRAPHQL_KEY,
  KUBERA_ACCOUNT_MENU_PUBLISH_API,
  KUBERA_ACCOUNT_MENU_INSERT_API,
  KUBERA_ACCOUNT_MENU_DELETE_API,
  KUBERA_ACCOUNT_MENU_UPDATE_API
} from '../common/constanst';
import * as localMenuJsonData from 'src/app/sampleResponse/menu-list.json';

interface MenuItem {
  id: number;
  name: string;
  cost: number;
  type: string;
  available: string;
  description: string;
  category: string;
  emoji: string;
  originalCourseIndex: number;
  originalItemIndex: number;
  list?: { [key: string]: number };
  course_id?: number;
  image_path?: string;
  ingredients?: string;
  item_available?: boolean;
  item_desc?: string;
  item_label?: string;
  list_name?: string;
  must_try?: boolean;
  rating?: number;
  type_path?: string;
}

@Component({
  selector: 'app-menu-update',
  templateUrl: './menu-update.component.html',
  styleUrls: ['./menu-update.component.scss']
})
export class MenuUpdateComponent implements OnInit {
  // Login State
  isLoggedIn = false;
  usernameInput = '';
  passwordInput = '';
  loginError = '';
  showPassword = false;
  showOtpPanel = false;
  generatedOtp = '';
  otpInput = '';
  publishNotes = '';
  activeTab = 'menu';
  historyLoading = false;
  publishHistoryList: any[] = [];
  historySearchTerm = '';
  historyPageSize = 5;
  historyCurrentPage = 1;
  historyTotalCount = 0;

  // Menu State
  loading = false;
  menuRawData: any = null;
  menuItemsList: MenuItem[] = [];
  filteredMenuItemsList: MenuItem[] = [];
  searchTerm = '';
  selectedStatusFilter = 'all';
  selectedCourseFilter = 'all';
  categoriesList: string[] = [];
  categoryToCourseIdMap: { [key: string]: number } = {};

  // Edit Modal State
  showEditModal = false;
  selectedEditItem: MenuItem | null = null;
  editForm = {
    name: '',
    cost: 0,
    type: 'veg',
    available: 'y',
    description: '',
    course_id: 1,
    image_path: '',
    ingredients: '',
    item_available: true,
    item_desc: '',
    item_label: '',
    list_name: '',
    must_try: false,
    rating: 5,
    type_path: ''
  };
  editCustomizations: { name: string, price: number }[] = [];

  // Add Modal State
  showAddModal = false;
  addForm = {
    name: '',
    cost: 0,
    type: 'veg',
    category: '',
    available: 'y',
    description: '',
    course_id: 1,
    image_path: '',
    ingredients: '',
    item_available: true,
    item_desc: '',
    item_label: '',
    list_name: '',
    must_try: false,
    rating: 5,
    type_path: ''
  };
  addCustomizations: { name: string, price: number }[] = [];

  // Delete Modal State
  showDeleteConfirmModal = false;
  itemToDelete: MenuItem | null = null;
  unpublishedChangesCount = 0;
  unpublishedChangesList: string[] = [];
  showPublishConfirmModal = false;

  // Alert State
  alertMessage = '';
  alertType: 'success' | 'error' | '' = '';

  constructor(private http: HttpClient, private graphqlService: GraphqlService) {}

  ngOnInit(): void {
    // Force logout on page refresh / initialization
    sessionStorage.removeItem('menu_update_authorized');
    sessionStorage.removeItem('menu_update_username');
    this.isLoggedIn = false;
    this.usernameInput = '';

    const cachedCount = sessionStorage.getItem('unpublished_changes_count');
    if (cachedCount) {
      this.unpublishedChangesCount = parseInt(cachedCount, 10);
    }
    const cachedList = sessionStorage.getItem('unpublished_changes_list');
    if (cachedList) {
      try {
        this.unpublishedChangesList = JSON.parse(cachedList);
      } catch (e) {
        this.unpublishedChangesList = [];
      }
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  handleLogin(): void {
    this.loginError = '';
    
    if (!this.usernameInput.trim() || !this.passwordInput.trim()) {
      this.loginError = 'Please fill in all fields.';
      return;
    }

    const username = this.usernameInput.trim();
    const password = this.passwordInput;

    // Check if the credentials match the master admin credentials for direct OTP-less login
    if (username === KUBERA_PUBLIC_PROFILE_LOGIN_USER_NAME && password === KUBERA_PUBLIC_PROFILE_LOGIN_PASSWORD) {
      this.isLoggedIn = true;
      sessionStorage.setItem('menu_update_authorized', 'true');
      sessionStorage.setItem('menu_update_username', username);
      this.loginError = '';
      this.fetchMenuDetails();
      this.triggerAlert('Logged in directly as admin.', 'success');
      return;
    }

    this.loading = true;

    this.graphqlService.getEmployeeLoginDetailsByUserName(username).subscribe({
      next: (result: any) => {
        const employee = result?.data?.kubera_employee_login?.[0];
        if (employee) {
          let dbPassword = '';
          try {
            // Decode stored base64 password
            dbPassword = JSON.parse(atob(employee.password));
          } catch (e) {
            try {
              dbPassword = atob(employee.password);
            } catch (err) {
              dbPassword = employee.password;
            }
          }

          if (dbPassword === password) {
            // Credentials correct. Generate OTP
            this.generatedOtp = (Math.floor(Math.random() * 9000) + 1000).toString();
            console.log('Generated Login OTP:', this.generatedOtp); // For development convenience

            const request = {
              recipient: 'cafekubera2223@gmail.com',
              msgBody: `Hey! ${username}\nThis is a verification OTP for menu updating.\n\nHere is the OTP: ${this.generatedOtp}\n\nThanks,\nCafe Kubera`,
              subject: `${this.generatedOtp} is OTP for Menu Updating for the user ${username}`
            };

            this.http.post<any>('https://email-serverless-project.vercel.app/api/send-notification', request).subscribe({
              next: () => {
                this.loading = false;
                this.showOtpPanel = true;
                this.loginError = '';
                this.triggerAlert('OTP sent successfully to registered email.', 'success');
              },
              error: (err) => {
                this.loading = false;
                console.error('Failed to send OTP email:', err);
                // Show error but still switch to OTP screen so fallback is available if needed
                this.showOtpPanel = true;
                this.loginError = 'Failed to send OTP to email. Entering fallback mode.';
              }
            });
          } else {
            this.loading = false;
            this.loginError = 'Invalid username or password.';
          }
        } else {
          this.loading = false;
          this.loginError = 'Invalid username or password.';
        }
      },
      error: (err: any) => {
        this.loading = false;
        console.error('DB query error:', err);
        this.loginError = 'An error occurred during verification. Please try again.';
      }
    });
  }

  verifyOtpAndLogin(): void {
    this.loginError = '';
    
    if (!this.otpInput.trim()) {
      this.loginError = 'Please enter the OTP.';
      return;
    }

    if (this.otpInput.trim() === this.generatedOtp) {
      this.isLoggedIn = true;
      sessionStorage.setItem('menu_update_authorized', 'true');
      sessionStorage.setItem('menu_update_username', this.usernameInput.trim());
      this.showOtpPanel = false;
      this.generatedOtp = '';
      this.otpInput = '';
      this.loginError = '';
      this.fetchMenuDetails();
    } else {
      this.loginError = 'Invalid OTP. Please try again.';
    }
  }

  goBackToCredentials(): void {
    this.showOtpPanel = false;
    this.generatedOtp = '';
    this.otpInput = '';
    this.loginError = '';
  }

  handleLogout(): void {
    this.isLoggedIn = false;
    sessionStorage.removeItem('menu_update_authorized');
    sessionStorage.removeItem('menu_update_username');
    sessionStorage.removeItem('unpublished_changes_count');
    sessionStorage.removeItem('unpublished_changes_list');
    this.usernameInput = '';
    this.passwordInput = '';
    this.searchTerm = '';
    this.selectedStatusFilter = 'all';
    this.selectedCourseFilter = 'all';
    this.unpublishedChangesCount = 0;
    this.unpublishedChangesList = [];
    this.menuItemsList = [];
    this.filteredMenuItemsList = [];
    this.activeTab = 'menu';
    this.publishHistoryList = [];
    this.historySearchTerm = '';
    this.historyPageSize = 5;
    this.historyCurrentPage = 1;
    this.historyTotalCount = 0;
  }

  switchTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'history') {
      this.historyCurrentPage = 1;
      this.historySearchTerm = '';
      this.fetchPublishHistory();
    }
  }

  fetchPublishHistory(): void {
    this.historyLoading = true;
    
    const limit = this.historyPageSize;
    const offset = (this.historyCurrentPage - 1) * this.historyPageSize;
    
    // Construct search condition (search term matches username or publish notes case-insensitively)
    let whereClause: any = {};
    const searchVal = this.historySearchTerm.trim();
    if (searchVal) {
      whereClause = {
        _or: [
          { username: { _ilike: `%${searchVal}%` } },
          { publish_notes: { _ilike: `%${searchVal}%` } }
        ]
      };
    }

    const query = `
      query GetMenuHistory($limit: Int!, $offset: Int!, $where: menu_history_bool_exp!) {
        menu_history(limit: $limit, offset: $offset, where: $where, order_by: {created_at: desc}) {
          id
          username
          publish_notes
          created_at
        }
        menu_history_aggregate(where: $where) {
          aggregate {
            count
          }
        }
      }
    `;

    const variables = {
      limit,
      offset,
      where: whereClause
    };

    const payload = { query, variables };
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': KUBERA_ACCOUNT_MENU_GRAPHQL_KEY,
    });

    this.http.post<any>('https://wanted-manatee-76.hasura.app/v1/graphql', payload, { headers }).subscribe({
      next: (response) => {
        this.publishHistoryList = response?.data?.menu_history || [];
        this.historyTotalCount = response?.data?.menu_history_aggregate?.aggregate?.count || 0;
        this.historyLoading = false;
      },
      error: (error) => {
        console.error('Failed to fetch menu publish history:', error);
        this.historyLoading = false;
        this.triggerAlert('Failed to load publish history.', 'error');
      }
    });
  }

  get totalPages(): number {
    return Math.ceil(this.historyTotalCount / this.historyPageSize) || 1;
  }

  nextPage(): void {
    if (this.historyCurrentPage < this.totalPages) {
      this.historyCurrentPage++;
      this.fetchPublishHistory();
    }
  }

  prevPage(): void {
    if (this.historyCurrentPage > 1) {
      this.historyCurrentPage--;
      this.fetchPublishHistory();
    }
  }

  onHistorySearch(): void {
    this.historyCurrentPage = 1;
    this.fetchPublishHistory();
  }

  clearHistorySearch(): void {
    this.historySearchTerm = '';
    this.historyCurrentPage = 1;
    this.fetchPublishHistory();
  }

  fetchMenuDetails(): void {
    this.loading = true;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': KUBERA_ACCOUNT_MENU_GRAPHQL_KEY,
    });

    this.http.get<any>(KUBERA_ACCOUNT_MENU_GRAPHQL_QUERY_API, { headers }).subscribe({
      next: (response) => {
        this.menuRawData = response;
        this.processMenuResponse(response);
        this.loading = false;
      },
      error: (error) => {
        console.error('Remote menu fetch failed, falling back to local JSON.', error);
        // Fallback to sample local JSON
        this.menuRawData = (localMenuJsonData as any).default || localMenuJsonData;
        this.processMenuResponse(this.menuRawData);
        this.loading = false;
      }
    });
  }

  processMenuResponse(rawData: any): void {
    const rawMenu = rawData?.menu_json_mv?.[0]?.menu_json?.menu || rawData?.menu || [];
    const parsedItems: MenuItem[] = [];
    const parsedCategories = new Set<string>();
    this.categoryToCourseIdMap = {};

    if (Array.isArray(rawMenu)) {
      rawMenu.forEach((course: any, courseIndex: number) => {
        const categoryName = course.course?.type || 'Other';
        const typemoji = course.course?.typemoji || '🍽️';
        const items = course.course?.items || [];
        
        parsedCategories.add(categoryName);
        
        // Find course_id if items exist, otherwise default to courseIndex + 1
        let courseId = courseIndex + 1;
        if (Array.isArray(items) && items.length > 0) {
          const firstItem = items[0];
          courseId = firstItem.course_id || firstItem.courseId || (courseIndex + 1);
        }
        this.categoryToCourseIdMap[categoryName] = courseId;
        
        if (Array.isArray(items)) {
          items.forEach((item: any, itemIndex: number) => {
            parsedItems.push({
              id: item.id,
              name: item.name || '',
              cost: item.cost || 0,
              type: item.type || 'veg',
              available: item.available || 'y',
              description: item.description || item.ingredients || '',
              category: categoryName,
              emoji: typemoji,
              originalCourseIndex: courseIndex,
              originalItemIndex: itemIndex,
              list: item.list || {},
              course_id: item.course_id || item.courseId || courseId,
              image_path: item.image_path || item.imagePath || '',
              ingredients: item.ingredients || '',
              item_available: item.item_available !== undefined ? item.item_available : (item.available === 'y'),
              item_desc: item.item_desc || item.desc || '',
              item_label: item.item_label || item.itemLabel || '',
              list_name: item.list_name || item.listName || categoryName,
              must_try: item.must_try !== undefined ? item.must_try : (item.mustTry !== undefined ? item.mustTry : false),
              rating: item.rating || 5,
              type_path: item.type_path || item.typePath || ''
            });
          });
        }
      });
    }

    this.categoriesList = Array.from(parsedCategories);
    this.menuItemsList = parsedItems;
    this.filterItems();
  }

  filterItems(): void {
    const term = this.searchTerm.trim().toLowerCase();

    this.filteredMenuItemsList = this.menuItemsList.filter(item => {
      // 1. Search term match (name, category, or ID)
      const matchesSearch = !term ||
        item.name.toLowerCase().includes(term) ||
        item.category.toLowerCase().includes(term) ||
        item.id.toString().includes(term);

      // 2. Status filter match (y = active, n = inactive/hidden, d = deleted)
      let matchesStatus = true;
      if (this.selectedStatusFilter !== 'all') {
        const itemStatus = item.available?.toLowerCase();
        matchesStatus = (itemStatus === this.selectedStatusFilter);
      }

      // 3. Course filter match (category name)
      let matchesCourse = true;
      if (this.selectedCourseFilter !== 'all') {
        matchesCourse = (item.category === this.selectedCourseFilter);
      }

      return matchesSearch && matchesStatus && matchesCourse;
    });

    // Sort: Active ('y') first, Inactive ('n') second, Deleted ('d') third
    this.filteredMenuItemsList.sort((a, b) => {
      const statusA = (a.available || 'y').toLowerCase();
      const statusB = (b.available || 'y').toLowerCase();
      
      const getWeight = (status: string) => {
        if (status === 'y') return 1;
        if (status === 'n') return 2;
        if (status === 'd') return 3;
        return 4;
      };
      
      return getWeight(statusA) - getWeight(statusB);
    });
  }

  getKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  openEditModal(item: MenuItem): void {
    this.selectedEditItem = item;

    // Resolve the category name based on the item's course_id
    const targetCourseId = item.course_id || 1;
    let resolvedCategory = '';
    if (this.categoryToCourseIdMap) {
      resolvedCategory = Object.keys(this.categoryToCourseIdMap).find(
        key => this.categoryToCourseIdMap[key] === targetCourseId
      ) || '';
    }

    // Fallback to item.category, item.list_name, or default first category if resolved category is not found in options list
    if (!resolvedCategory || !this.categoriesList.includes(resolvedCategory)) {
      resolvedCategory = item.category || item.list_name || (this.categoriesList[0] || 'Other');
    }

    let resolvedType = (item.type || 'veg').toLowerCase();
    if (resolvedType === 'v' || resolvedType === 'veg') {
      resolvedType = 'veg';
    } else if (resolvedType === 'nv' || resolvedType === 'non-veg') {
      resolvedType = 'nv';
    } else {
      resolvedType = 'veg';
    }

    this.editForm = {
      name: item.name,
      cost: item.cost,
      type: resolvedType,
      available: (item.available || 'y').toLowerCase(),
      description: item.description,
      course_id: targetCourseId,
      image_path: item.image_path || '',
      ingredients: item.ingredients || '',
      item_available: item.item_available !== undefined ? item.item_available : (item.available === 'y'),
      item_desc: item.item_desc || '',
      item_label: item.item_label || '',
      list_name: resolvedCategory,
      must_try: item.must_try !== undefined ? item.must_try : false,
      rating: item.rating || 5,
      type_path: item.type_path || ''
    };
    
    // Map list map to local array for bindings
    this.editCustomizations = Object.keys(item.list || {}).map(key => ({
      name: key,
      price: item.list![key]
    }));

    document.body.style.overflow = 'hidden';
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedEditItem = null;
    this.editCustomizations = [];
    document.body.style.overflow = 'auto';
  }

  saveEdit(): void {
    if (!this.selectedEditItem) return;

    // Capture state before closing the modal
    const currentEditItem = this.selectedEditItem;
    const capturedEditForm = { ...this.editForm };
    const capturedCustomizations = [...this.editCustomizations];
    const updatedItemName = capturedEditForm.name;

    // Close immediately to improve perceived performance
    this.closeEditModal();
    this.loading = true;

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': KUBERA_ACCOUNT_MENU_GRAPHQL_KEY,
    });

    const payload = {
      id: currentEditItem.id,
      changes: {
        name: capturedEditForm.name,
        cost: capturedEditForm.cost,
        description: capturedEditForm.description,
        available: capturedEditForm.available,
        course_id: capturedEditForm.course_id,
        image_path: capturedEditForm.image_path,
        ingredients: capturedEditForm.ingredients,
        item_available: capturedEditForm.item_available,
        item_desc: capturedEditForm.item_desc,
        item_label: capturedEditForm.item_label,
        list_name: capturedEditForm.list_name,
        must_try: capturedEditForm.must_try,
        rating: capturedEditForm.rating,
        type: capturedEditForm.type,
        type_path: capturedEditForm.type_path
      }
    };

    this.http.post<any>(KUBERA_ACCOUNT_MENU_UPDATE_API, payload, { headers }).subscribe({
      next: (response) => {
        // Resolve target options to insert
        const optionsArray = capturedCustomizations
          .filter(opt => opt.name.trim())
          .map(opt => ({
            menu_item_id: currentEditItem.id,
            option_name: opt.name.trim(),
            price_modifier: opt.price
          }));

        const proceedWithLocalUpdate = () => {
          this.loading = false;
          const index = this.menuItemsList.findIndex(item => item.id === currentEditItem.id);
          if (index !== -1) {
            this.menuItemsList[index].name = capturedEditForm.name;
            this.menuItemsList[index].cost = capturedEditForm.cost;
            this.menuItemsList[index].type = capturedEditForm.type;
            this.menuItemsList[index].available = capturedEditForm.available;
            this.menuItemsList[index].description = capturedEditForm.description;
            this.menuItemsList[index].course_id = capturedEditForm.course_id;
            this.menuItemsList[index].image_path = capturedEditForm.image_path;
            this.menuItemsList[index].ingredients = capturedEditForm.ingredients;
            this.menuItemsList[index].item_available = capturedEditForm.item_available;
            this.menuItemsList[index].item_desc = capturedEditForm.item_desc;
            this.menuItemsList[index].item_label = capturedEditForm.item_label;
            this.menuItemsList[index].list_name = capturedEditForm.list_name;
            this.menuItemsList[index].must_try = capturedEditForm.must_try;
            this.menuItemsList[index].rating = capturedEditForm.rating;
            this.menuItemsList[index].type_path = capturedEditForm.type_path;

            // Construct customizations map from array
            const updatedList: { [key: string]: number } = {};
            capturedCustomizations.forEach(opt => {
              if (opt.name.trim()) {
                updatedList[opt.name.trim()] = opt.price;
              }
            });
            this.menuItemsList[index].list = updatedList;
          }
          
          this.filterItems();
          this.incrementUnpublishedChanges(`Successfully updated "${updatedItemName}"`);
        };

        const deleteMutation = `
          mutation UpdateCustomizations($menuItemId: Int!, $options: [item_options_insert_input!]!) {
            delete_item_options(where: {menu_item_id: {_eq: $menuItemId}}) {
              affected_rows
            }
            insert_item_options(objects: $options) {
              affected_rows
            }
          }
        `;

        const graphqlPayload = {
          query: deleteMutation,
          variables: {
            menuItemId: currentEditItem.id,
            options: optionsArray
          }
        };

        const graphqlHeaders = new HttpHeaders({
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': KUBERA_ACCOUNT_MENU_GRAPHQL_KEY,
        });

        this.http.post<any>('https://wanted-manatee-76.hasura.app/v1/graphql', graphqlPayload, { headers: graphqlHeaders }).subscribe({
          next: () => {
            proceedWithLocalUpdate();
          },
          error: (err) => {
            console.error('Failed to update customizations:', err);
            // Still update the UI locally to reflect form changes
            proceedWithLocalUpdate();
          }
        });
      },
      error: (error) => {
        this.loading = false;
        console.error('Failed to update menu item:', error);
        this.triggerAlert('Failed to update menu item. Check console logs.', 'error');
      }
    });
  }

  addEditCustomizationOption(): void {
    this.editCustomizations.push({ name: '', price: 0 });
  }

  deleteEditCustomizationOption(index: number): void {
    this.editCustomizations.splice(index, 1);
  }

  onCategoryChange(): void {
    const selectedCategory = this.addForm.category;
    if (selectedCategory && this.categoryToCourseIdMap[selectedCategory] !== undefined) {
      this.addForm.course_id = this.categoryToCourseIdMap[selectedCategory];
    }
  }

  onEditCategoryChange(): void {
    const selectedCategory = this.editForm.list_name;
    if (selectedCategory && this.categoryToCourseIdMap[selectedCategory] !== undefined) {
      this.editForm.course_id = this.categoryToCourseIdMap[selectedCategory];
    }
  }

  openAddModal(): void {
    const defaultCategory = this.categoriesList[0] || 'Other';
    this.addForm = {
      name: '',
      cost: 0,
      type: 'veg',
      category: defaultCategory,
      available: 'y',
      description: '',
      course_id: this.categoryToCourseIdMap[defaultCategory] || 1,
      image_path: '',
      ingredients: '',
      item_available: true,
      item_desc: '',
      item_label: '',
      list_name: defaultCategory,
      must_try: false,
      rating: 5,
      type_path: ''
    };
    this.addCustomizations = [];
    document.body.style.overflow = 'hidden';
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.addCustomizations = [];
    document.body.style.overflow = 'auto';
  }

  saveNewItem(): void {
    if (!this.addForm.name.trim()) {
      this.triggerAlert('Item name is required!', 'error');
      return;
    }

    // Capture state before closing the modal
    const capturedAddForm = { ...this.addForm };
    const capturedCustomizations = [...this.addCustomizations];

    // Close immediately to improve perceived performance
    this.closeAddModal();
    this.loading = true;

    // Construct customizations map
    const newList: { [key: string]: number } = {};
    capturedCustomizations.forEach(opt => {
      if (opt.name.trim()) {
        newList[opt.name.trim()] = opt.price;
      }
    });

    const itemPayload = {
      item: {
        name: capturedAddForm.name,
        cost: capturedAddForm.cost,
        course_id: capturedAddForm.course_id,
        description: capturedAddForm.description,
        available: capturedAddForm.available,
        image_path: capturedAddForm.image_path,
        ingredients: capturedAddForm.ingredients,
        item_available: capturedAddForm.item_available,
        item_desc: capturedAddForm.item_desc,
        item_label: capturedAddForm.item_label,
        list_name: null,
        must_try: capturedAddForm.must_try,
        rating: capturedAddForm.rating,
        type: capturedAddForm.type,
        type_path: capturedAddForm.type_path
      }
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': KUBERA_ACCOUNT_MENU_GRAPHQL_KEY,
    });

    this.http.post<any>(KUBERA_ACCOUNT_MENU_INSERT_API, itemPayload, { headers }).subscribe({
      next: (response) => {
        const insertedId = response?.insert_menu_items_one?.id || response?.id || 1001;

        // Resolve options to insert
        const optionsArray = capturedCustomizations
          .filter(opt => opt.name.trim())
          .map(opt => ({
            menu_item_id: insertedId,
            option_name: opt.name.trim(),
            price_modifier: opt.price
          }));

        const proceedWithLocalInsert = () => {
          this.loading = false;
          // Create a new MenuItem for local updates
          const newItem: MenuItem = {
            id: insertedId,
            name: capturedAddForm.name,
            cost: capturedAddForm.cost,
            type: capturedAddForm.type,
            available: capturedAddForm.available,
            description: capturedAddForm.description,
            category: capturedAddForm.category || 'Other',
            emoji: '🍽️',
            originalCourseIndex: -1,
            originalItemIndex: -1,
            list: newList,
            course_id: capturedAddForm.course_id,
            image_path: capturedAddForm.image_path,
            ingredients: capturedAddForm.ingredients,
            item_available: capturedAddForm.item_available,
            item_desc: capturedAddForm.item_desc,
            item_label: capturedAddForm.item_label,
            list_name: undefined,
            must_try: capturedAddForm.must_try,
            rating: capturedAddForm.rating,
            type_path: capturedAddForm.type_path
          };

          // Add to local list
          this.menuItemsList.unshift(newItem);
          this.filterItems();
          this.incrementUnpublishedChanges(`Successfully created item "${newItem.name}"!`);
        };

        if (optionsArray.length > 0) {
          const insertMutation = `
            mutation InsertCustomizations($options: [item_options_insert_input!]!) {
              insert_item_options(objects: $options) {
                affected_rows
              }
            }
          `;

          const graphqlPayload = {
            query: insertMutation,
            variables: {
              options: optionsArray
            }
          };

          const graphqlHeaders = new HttpHeaders({
            'Content-Type': 'application/json',
            'x-hasura-admin-secret': KUBERA_ACCOUNT_MENU_GRAPHQL_KEY,
          });

          this.http.post<any>('https://wanted-manatee-76.hasura.app/v1/graphql', graphqlPayload, { headers: graphqlHeaders }).subscribe({
            next: () => {
              proceedWithLocalInsert();
            },
            error: (err) => {
              console.error('Failed to save options for new item:', err);
              // Fallback to local insert anyway so the item appears
              proceedWithLocalInsert();
            }
          });
        } else {
          proceedWithLocalInsert();
        }
      },
      error: (error) => {
        this.loading = false;
        console.error('Failed to create menu item:', error);
        this.triggerAlert('Failed to create menu item. Check console logs.', 'error');
      }
    });
  }

  addAddCustomizationOption(): void {
    this.addCustomizations.push({ name: '', price: 0 });
  }

  deleteAddCustomizationOption(index: number): void {
    this.addCustomizations.splice(index, 1);
  }

  publishMenu(): void {
    this.publishNotes = this.unpublishedChangesList.join('\n');
    this.showPublishConfirmModal = true;
    document.body.style.overflow = 'hidden';
  }

  closePublishConfirmModal(): void {
    this.showPublishConfirmModal = false;
    document.body.style.overflow = 'auto';
  }

  executePublish(): void {
    this.showPublishConfirmModal = false;
    document.body.style.overflow = 'auto';
    this.loading = true;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': KUBERA_ACCOUNT_MENU_GRAPHQL_KEY,
    });

    this.http.post<any>(KUBERA_ACCOUNT_MENU_PUBLISH_API, {}, { headers }).subscribe({
      next: (response) => {
        // Send the publish history entry using Hasura Rest API
        const historyPayload = {
          username: this.usernameInput || 'anonymous',
          publish_notes: this.publishNotes.trim() || 'Menu published successfully.'
        };
        
        const historyHeaders = new HttpHeaders({
          'Content-Type': 'application/json',
          'x-hasura-admin-secret': 'PBKTTM8ekQrfSpPbHwX4sDTpgCAIOTj5FKZhqugY54NXIGPaDXi7UgQ17x5AHZjq'
        });
        
        this.http.post<any>('https://wanted-manatee-76.hasura.app/api/rest/addmenuhistory', historyPayload, { headers: historyHeaders }).subscribe({
          next: (histRes) => {
            console.log('Publish history logged successfully:', histRes);
          },
          error: (histErr) => {
            console.error('Failed to log publish history:', histErr);
          }
        });

        this.unpublishedChangesCount = 0;
        this.unpublishedChangesList = [];
        sessionStorage.removeItem('unpublished_changes_count');
        sessionStorage.removeItem('unpublished_changes_list');
        this.triggerAlert('Menu published successfully!', 'success');
        this.fetchMenuDetails();
      },
      error: (error) => {
        console.error('Publishing failed', error);
        this.loading = false;
        this.triggerAlert('Failed to publish menu. Check logs.', 'error');
      }
    });
  }

  confirmDeleteMenuItem(item: MenuItem): void {
    this.itemToDelete = item;
    this.showDeleteConfirmModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeDeleteConfirmModal(): void {
    this.showDeleteConfirmModal = false;
    this.itemToDelete = null;
    document.body.style.overflow = 'auto';
  }

  incrementUnpublishedChanges(successMessage: string): void {
    this.unpublishedChangesCount++;
    this.unpublishedChangesList.unshift(successMessage);
    sessionStorage.setItem('unpublished_changes_count', this.unpublishedChangesCount.toString());
    sessionStorage.setItem('unpublished_changes_list', JSON.stringify(this.unpublishedChangesList));
    this.triggerAlert(successMessage, 'success');
  }

  executeDeleteMenuItem(): void {
    if (!this.itemToDelete) return;

    this.loading = true;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': KUBERA_ACCOUNT_MENU_GRAPHQL_KEY,
    });

    const payload = {
      id: this.itemToDelete.id,
      status: 'D'
    };

    const deletedItemName = this.itemToDelete.name;

    this.http.post<any>(KUBERA_ACCOUNT_MENU_DELETE_API, payload, { headers }).subscribe({
      next: (response) => {
        this.loading = false;
        if (this.itemToDelete) {
          this.itemToDelete.available = 'd';
        }
        this.filterItems();
        this.closeDeleteConfirmModal();
        this.incrementUnpublishedChanges(`Successfully deleted "${deletedItemName}"`);
      },
      error: (error) => {
        this.loading = false;
        console.error('Failed to delete item:', error);
        this.triggerAlert('Failed to delete menu item. Check console logs.', 'error');
        this.closeDeleteConfirmModal();
      }
    });
  }

  toggleItemAvailability(item: MenuItem): void {
    const newStatus = (item.available?.toLowerCase() === 'y') ? 'N' : 'Y';
    const statusLabel = newStatus === 'N' ? 'inactive' : 'active';

    this.loading = true;
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': KUBERA_ACCOUNT_MENU_GRAPHQL_KEY,
    });

    const payload = {
      id: item.id,
      status: newStatus
    };

    this.http.post<any>(KUBERA_ACCOUNT_MENU_DELETE_API, payload, { headers }).subscribe({
      next: (response) => {
        this.loading = false;
        item.available = newStatus.toLowerCase();
        this.filterItems();
        this.incrementUnpublishedChanges(`Successfully marked item "${item.name}" as ${statusLabel}`);
      },
      error: (error) => {
        this.loading = false;
        console.error(`Failed to change item availability to ${statusLabel}:`, error);
        this.triggerAlert(`Failed to update item availability. Check console logs.`, 'error');
      }
    });
  }

  triggerAlert(message: string, type: 'success' | 'error'): void {
    this.alertMessage = message;
    this.alertType = type;
    setTimeout(() => {
      this.alertMessage = '';
      this.alertType = '';
    }, 4000);
  }
}
