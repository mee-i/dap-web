export interface DapExample {
  id: string
  titleId: string
  titleEn: string
  descriptionId: string
  descriptionEn: string
  fileName: string
  defaultStdin?: string
  recommendedEngine?: 'interpreter' | 'vm'
  code: string
}

export const DAP_EXAMPLES: DapExample[] = [
  {
    id: 'factorial',
    titleId: 'Faktorial & Perulangan (Dasar)',
    titleEn: 'Factorial & Loop (Basic)',
    descriptionId: 'Contoh klasik dari README DAP — kompatibel penuh dengan Interpreter & Bytecode VM.',
    descriptionEn: 'Classic example from DAP README — works with both Interpreter & Bytecode VM.',
    fileName: 'factorial.dap',
    recommendedEngine: 'interpreter',
    code: `program HitungFaktorial
dictionary
    n, hasil : integer
algorithm
    {{ Inisialisasi nilai hasil }}
    n <- 10
    hasil <- 1

    for i = 1 to n do
        hasil <- hasil * i
        print hasil
    endfor

    print "Selesai!"
endprogram`,
  },
  {
    id: 'singly-linked-list',
    titleId: 'Singly Linked List (Pointer & Heap)',
    titleEn: 'Singly Linked List (Pointers & Heap)',
    descriptionId: 'Contoh ADT Singly Linked List asli dari repo DAP — sangat cocok untuk mencoba Debugger & Heap Visualizer!',
    descriptionEn: 'Upstream Singly Linked List ADT example — ideal for trying the Debugger & Heap Visualizer!',
    fileName: 'singly_linked_list.dap',
    recommendedEngine: 'interpreter',
    code: `{{ Singly Linked List (SLL) ADT Example in DAP }}
program SinglyLinkedListDemo
dictionary
    type ElmList : <
        info : integer,
        next : pointer to ElmList
    >
    type Address : pointer to ElmList
    type List : <
        first : Address
    >

    procedure createList(out L : List)
        L.first <- nil
    endprocedure

    procedure alokasi(out P : Address, in X : integer)
        allocate(P)
        P->info <- X
        P->next <- nil
    endprocedure

    procedure dealokasi(inout P : Address)
        deallocate(P)
    endprocedure

    procedure insertFirst(inout L : List, in P : Address)
        P->next <- L.first
        L.first <- P
    endprocedure

    procedure insertLast(inout L : List, in P : Address)
        dictionary
            last : Address
        algorithm
            if L.first == nil then
                L.first <- P
            else
                last <- L.first
                while last->next != nil do
                    last <- last->next
                endwhile
                last->next <- P
            endif
    endprocedure

    procedure insertAfter(inout L : List, in P : Address, in Prec : Address)
        if Prec != nil then
            P->next <- Prec->next
            Prec->next <- P
        endif
    endprocedure

    procedure deleteFirst(inout L : List, out P : Address)
        if L.first != nil then
            P <- L.first
            L.first <- L.first->next
            P->next <- nil
        else
            P <- nil
        endif
    endprocedure

    procedure deleteLast(inout L : List, out P : Address)
        dictionary
            last, prev : Address
        algorithm
            if L.first == nil then
                P <- nil
            else
                if L.first->next == nil then
                    P <- L.first
                    L.first <- nil
                else
                    prev <- nil
                    last <- L.first
                    while last->next != nil do
                        prev <- last
                        last <- last->next
                    endwhile
                    P <- last
                    prev->next <- nil
                endif
            endif
    endprocedure

    function search(L : List, X : integer) -> Address
        dictionary
            curr : Address
        algorithm
            curr <- L.first
            while curr != nil do
                if curr->info == X then
                    return curr
                endif
                curr <- curr->next
            endwhile
            return nil
    endfunction

    procedure printList(in L : List)
        dictionary
            curr : Address
        algorithm
            output("--- Singly Linked List ---")
            if L.first == nil then
                output("[Empty List]")
            else
                curr <- L.first
                while curr != nil do
                    output(curr->info)
                    curr <- curr->next
                endwhile
            endif
    endprocedure

    L : List
    P, Prec : Address
algorithm
    createList(L)
    printList(L)

    alokasi(P, 10)
    insertFirst(L, P)

    alokasi(P, 20)
    insertLast(L, P)

    alokasi(P, 5)
    insertFirst(L, P)

    Prec <- search(L, 10)
    if Prec != nil then
        alokasi(P, 15)
        insertAfter(L, P, Prec)
    endif

    printList(L)

    deleteFirst(L, P)
    output("Deleted First Element:")
    output(P->info)
    dealokasi(P)

    deleteLast(L, P)
    output("Deleted Last Element:")
    output(P->info)
    dealokasi(P)

    printList(L)
endprogram`,
  },
  {
    id: 'stack',
    titleId: 'Dynamic Stack ADT (Pointer)',
    titleEn: 'Dynamic Stack ADT (Pointers)',
    descriptionId: 'Implementasi Stack dinamis dengan operasi push, pop, topInfo, dan dealokasi.',
    descriptionEn: 'Dynamic Stack implementation with push, pop, topInfo, and deallocate.',
    fileName: 'stack.dap',
    recommendedEngine: 'interpreter',
    code: `{{ Dynamic Stack ADT Example in DAP }}
program StackDemo
dictionary
    type ElmStack : <
        info : integer,
        next : pointer to ElmStack
    >
    type AddressStack : pointer to ElmStack
    type Stack : <
        top : AddressStack
    >

    procedure createStack(out S : Stack)
        S.top <- nil
    endprocedure

    function isEmpty(S : Stack) -> boolean
        return S.top == nil
    endfunction

    procedure push(inout S : Stack, in X : integer)
        dictionary
            P : AddressStack
        algorithm
            allocate(P)
            P->info <- X
            P->next <- S.top
            S.top <- P
    endprocedure

    procedure pop(inout S : Stack, out X : integer)
        dictionary
            P : AddressStack
        algorithm
            if S.top != nil then
                P <- S.top
                X <- P->info
                S.top <- S.top->next
                deallocate(P)
            else
                X <- -1
            endif
    endprocedure

    function topInfo(S : Stack) -> integer
        if S.top != nil then
            return S.top->info
        else
            return -1
        endif
    endfunction

    procedure printStack(in S : Stack)
        dictionary
            curr : AddressStack
        algorithm
            output("--- Stack Content (Top to Bottom) ---")
            if S.top == nil then
                output("[Empty Stack]")
            else
                curr <- S.top
                while curr != nil do
                    output(curr->info)
                    curr <- curr->next
                endwhile
            endif
    endprocedure

    S : Stack
    val : integer
algorithm
    createStack(S)
    printStack(S)
    if isEmpty(S) then
        output("Stack is currently empty.")
    endif

    output("Pushing: 100, 200, 300")
    push(S, 100)
    push(S, 200)
    push(S, 300)

    printStack(S)

    output("Current Top:")
    output(topInfo(S))

    pop(S, val)
    output("Popped element:")
    output(val)

    output("New Top after pop:")
    output(topInfo(S))

    pop(S, val)
    output("Popped element:")
    output(val)

    pop(S, val)
    output("Popped element:")
    output(val)

    printStack(S)
endprogram`,
  },
  {
    id: 'doubly-linked-list',
    titleId: 'Doubly Linked List (Forward & Backward)',
    titleEn: 'Doubly Linked List (Forward & Backward)',
    descriptionId: 'ADT Doubly Linked List dengan pointer next dan prev.',
    descriptionEn: 'Doubly Linked List ADT with next and prev pointers.',
    fileName: 'doubly_linked_list.dap',
    recommendedEngine: 'interpreter',
    code: `{{ Doubly Linked List (DLL) ADT Example in DAP }}
program DoublyLinkedListDemo
dictionary
    type ElmList2 : <
        info : integer,
        next : pointer to ElmList2,
        prev : pointer to ElmList2
    >
    type Address2 : pointer to ElmList2
    type List2 : <
        first : Address2,
        last  : Address2
    >

    procedure createList(out L : List2)
        L.first <- nil
        L.last  <- nil
    endprocedure

    procedure alokasi(out P : Address2, in X : integer)
        allocate(P)
        P->info <- X
        P->next <- nil
        P->prev <- nil
    endprocedure

    procedure insertFirst(inout L : List2, in P : Address2)
        if L.first != nil and L.last != nil then
            P->next <- L.first
            L.first->prev <- P
            L.first <- P
        else
            L.first <- P
            L.last  <- P
        endif
    endprocedure

    procedure insertLast(inout L : List2, in P : Address2)
        if L.first != nil and L.last != nil then
            P->prev <- L.last
            L.last->next <- P
            L.last <- P
        else
            L.first <- P
            L.last  <- P
        endif
    endprocedure

    procedure printForward(in L : List2)
        dictionary
            curr : Address2
        algorithm
            output("--- Forward ---")
            curr <- L.first
            while curr != nil do
                output(curr->info)
                curr <- curr->next
            endwhile
    endprocedure

    procedure printBackward(in L : List2)
        dictionary
            curr : Address2
        algorithm
            output("--- Backward ---")
            curr <- L.last
            while curr != nil do
                output(curr->info)
                curr <- curr->prev
            endwhile
    endprocedure

    L : List2
    P : Address2
algorithm
    createList(L)
    alokasi(P, 12)
    insertFirst(L, P)
    alokasi(P, 6)
    insertFirst(L, P)
    alokasi(P, 89)
    insertLast(L, P)

    printForward(L)
    printBackward(L)
endprogram`,
  },
  {
    id: 'interactive-input',
    titleId: 'Input Interaktif (Cari Minimum L8)',
    titleEn: 'Interactive Input (Find Minimum L8)',
    descriptionId: 'Membaca deret bilangan dari input hingga sentinel -241231 (dari examples/L8).',
    descriptionEn: 'Reads numbers from stdin until sentinel -241231 (from examples/L8).',
    fileName: 'l8_where_is_mimin.dap',
    recommendedEngine: 'interpreter',
    code: `{{ Contoh Latihan L8: Mencari nilai minimum hingga sentinel -241231 }}
{{ Ketik angka satu per satu langsung di terminal (misal: 42, 15, 99, 7, lalu -241231) }}
program WhereIsMimin
dictionary
    n, palingKecil : integer
algorithm
    read n
    palingKecil <- n

    while n != -241231 do
        if palingKecil > n then
            palingKecil <- n
        endif

        read n
    endwhile

    if palingKecil == -241231 then
        write "NONE"
    else
        write palingKecil
    endif
endprogram`,
  },
  {
    id: 'bytecode-vm-demo',
    titleId: 'Demo Bytecode VM & Operand Stack',
    titleEn: 'Bytecode VM & Operand Stack Demo',
    descriptionId: 'Deret Fibonacci & kondisi — jalankan dengan engine Bytecode VM lalu Debug untuk melihat Operand Stack!',
    descriptionEn: 'Fibonacci sequence & branching — run/debug on Bytecode VM to inspect the Operand Stack!',
    fileName: 'fibonacci_vm.dap',
    recommendedEngine: 'vm',
    code: `{{ Jalankan dengan Engine "Bytecode VM" lalu klik Debug untuk melihat Operand Stack! }}
program FibonacciVM
dictionary
    a, b, temp, i : integer
algorithm
    a <- 0
    b <- 1

    for i = 1 to 10 do
        print a
        temp <- a + b
        a <- b
        b <- temp
    endfor
endprogram`,
  },
]
