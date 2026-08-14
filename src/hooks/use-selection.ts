import { useCallback, useMemo, useState } from 'react';

/**
 * 多选集合 Hook（以 path 为唯一 key）
 * - 列表/网格视图共用同一选择集
 * - 提供全选、半选判定
 */
export function useSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const isSelected = useCallback((path: string): boolean => selected.has(path), [selected]);

  const toggle = useCallback((path: string): void => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  /** 批量设置（全选/取消全选） */
  const toggleAll = useCallback((paths: string[], checked: boolean): void => {
    setSelected(prev => {
      const next = new Set(prev);
      if (checked) {
        paths.forEach(p => next.add(p));
      } else {
        paths.forEach(p => next.delete(p));
      }
      return next;
    });
  }, []);

  /** 直接用指定集合替换选择集 */
  const setSelection = useCallback((paths: string[]): void => {
    setSelected(new Set(paths));
  }, []);

  const clear = useCallback((): void => {
    setSelected(new Set());
  }, []);

  const count = selected.size;

  /** 是否全部选中（非空目录） */
  const isAllSelected = useCallback(
    (paths: string[]): boolean => paths.length > 0 && paths.every(p => selected.has(p)),
    [selected],
  );

  /** 是否半选（部分选中） */
  const isIndeterminate = useCallback(
    (paths: string[]): boolean => {
      if (paths.length === 0) return false;
      const hit = paths.filter(p => selected.has(p)).length;
      return hit > 0 && hit < paths.length;
    },
    [selected],
  );

  return useMemo(
    () => ({ selected, count, isSelected, toggle, toggleAll, setSelection, clear, isAllSelected, isIndeterminate }),
    [selected, count, isSelected, toggle, toggleAll, setSelection, clear, isAllSelected, isIndeterminate],
  );
}
