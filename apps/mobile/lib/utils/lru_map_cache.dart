/// Fixed-size LRU cache backed by insertion-ordered [Map].
class LruMapCache<K, V> {
  LruMapCache({this.maxSize = 15}) : assert(maxSize > 0);

  final int maxSize;
  final Map<K, V> _entries = <K, V>{};

  bool containsKey(K key) => _entries.containsKey(key);

  V? operator [](K key) => _entries[key];

  Iterable<K> get keys => _entries.keys;

  Map<K, V> get snapshot => Map<K, V>.from(_entries);

  void put(K key, V value) {
    if (_entries.containsKey(key)) {
      _entries.remove(key);
    }
    _entries[key] = value;
    while (_entries.length > maxSize) {
      final oldest = _entries.keys.first;
      _entries.remove(oldest);
    }
  }

  void clear() => _entries.clear();
}
