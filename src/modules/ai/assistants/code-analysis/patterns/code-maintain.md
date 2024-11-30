# Critical Code Maintainability Patterns

1. **Single Responsibility Pattern**

    - Detection points:
        - Functions/classes doing multiple things
        - Mixed business logic layers
        - Unclear component boundaries
        - Tight coupling between concerns
    - Critical violations:
        ```typescript
        // Critical: Mixed responsibilities
        class UserManager {
            async createUser(userData: UserData) {
                const validatedData = this.validateUser(userData);
                const user = await db.users.create(validatedData);
                await emailService.sendWelcomeEmail(user.email);
                await this.updateSearchIndex(user);
                return user;
            }
        }

        // Should separate:
        class UserService {
            constructor(
                private validator: UserValidator,
                private emailService: EmailService,
                private searchService: SearchService
            ) {}

            async createUser(userData: UserData) {
                const validatedData = this.validator.validate(userData);
                const user = await this.repository.create(validatedData);
                await this.notifyUserCreated(user);
                return user;
            }
        }
        ```

2. **Code Organization Pattern**

    - Detection points:
        - Inconsistent file structure
        - Poor module boundaries
        - Circular dependencies
        - Unclear import patterns
    - Critical violations:
        ```typescript
        // Critical: Messy imports and circular deps
        import { UserType } from '../../../../../../types';
        import { validateEmail } from '../../../utils/validators';

        // Should use:
        import { UserType } from '@/types';
        import { validateEmail } from '@/utils/validators';

        // Organize by feature:
        /src
          /features
            /users
              /api
              /components
              /hooks
              /types
        ```

3. **State Management Pattern**

    - Detection points:
        - Unclear state ownership
        - State spread across components
        - Missing state documentation
        - Complex state interactions
    - Critical violations:
        ```typescript
        // Critical: Scattered state management
        function Component() {
            const [users, setUsers] = useState([]);
            const [loading, setLoading] = useState(false);
            const [error, setError] = useState(null);
            const [selectedUser, setSelectedUser] = useState(null);
            const [userDetails, setUserDetails] = useState(null);

            // Multiple useEffects managing related state
            useEffect(() => {
                /* fetch users */
            }, []);
            useEffect(() => {
                /* fetch details */
            }, [selectedUser]);
        }

        // Should centralize:
        function useUsers() {
            const [state, dispatch] = useReducer(userReducer, initialState);
            const actions = useMemo(
                () => ({
                    fetchUsers: async () => {
                        dispatch({ type: "FETCH_START" });
                        try {
                            const users = await api.getUsers();
                            dispatch({ type: "FETCH_SUCCESS", payload: users });
                        } catch (error) {
                            dispatch({ type: "FETCH_ERROR", payload: error });
                        }
                    },
                    // ... other actions
                }),
                []
            );

            return [state, actions];
        }
        ```

4. **Error Boundary Pattern**

    - Detection points:
        - Missing error boundaries
        - Poor error recovery
        - Inconsistent error handling
        - Missing fallback UI
    - Critical violations:
        ```typescript
        // Critical: No error boundaries
        function App() {
            return (
                <div>
                    <UserProfile />
                    <UserSettings />
                    <UserDashboard />
                </div>
            );
        }

        // Should implement:
        function App() {
            return (
                <ErrorBoundary
                    fallback={({ error, reset }) => <ErrorFallback error={error} reset={reset} />}
                >
                    <Suspense fallback={<Loading />}>
                        <UserProfile />
                        <UserSettings />
                        <UserDashboard />
                    </Suspense>
                </ErrorBoundary>
            );
        }
        ```

5. **Testing Pattern**
    - Detection points:
        - Missing critical test cases
        - Poor test isolation
        - Brittle tests
        - Unclear test purposes
    - Critical violations:
        ```typescript
        // Critical: Poor test structure
        describe('UserService', () => {
          it('should work', () => {
            const service = new UserService();
            expect(service.createUser({...})).toBeTruthy();
          });
        });

        // Should structure:
        describe('UserService', () => {
          describe('createUser', () => {
            it('should create valid user with correct data', () => {
              const service = new UserService(mockDeps);
              const result = await service.createUser(validUserData);
              expect(result).toMatchInlineSnapshot(`...`);
            });

            it('should throw validation error for invalid data', () => {
              expect(() =>
                service.createUser(invalidData)
              ).toThrow(ValidationError);
            });
          });
        });
        ```

Priority Assessment:

-   High:

    -   Code organization issues
    -   Unclear responsibilities
    -   Poor error handling
    -   Missing tests

-   Medium:

    -   Documentation gaps
    -   Test coverage
    -   Code duplication

-   Low:
    -   Style inconsistencies
    -   Minor optimizations

Critical Metrics:

1. Code Health:

    - Cyclomatic complexity
    - Dependency depth
    - File organization
    - Test coverage

2. Maintainability:
    - Documentation quality
    - Code modularity
    - Error handling
    - State management

Tools Integration:

-   ESLint with strict rules
-   SonarQube/similar quality tools
-   Test coverage tools
-   Documentation generators
